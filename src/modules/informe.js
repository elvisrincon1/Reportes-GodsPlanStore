import { collection, query, where, getDocs } from 'firebase/firestore';
import { mostrarError, mostrarExito, validarFechas, formatearMoneda, formatearFecha } from '../utils.js';
import { db } from '../firebase.js';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export default class Informe {
    constructor() {
        this.form = document.getElementById('informe-form');
        this.resultado = document.getElementById('informe-resultado');
        this.btnExportarPDF = document.getElementById('exportar-pdf');
        this.btnExportarXLSX = document.getElementById('exportar-xlsx');
        
        this.ventasData = null; // Almacenar datos del último informe generado
        
        this.inicializarEventos();
    }

    inicializarEventos() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.generarInforme();
        });

        this.btnExportarPDF.addEventListener('click', () => {
            if (this.ventasData) {
                this.exportarPDF();
            } else {
                mostrarError('Primero debe generar un informe');
            }
        });

        this.btnExportarXLSX.addEventListener('click', () => {
            if (this.ventasData) {
                this.exportarXLSX();
            } else {
                mostrarError('Primero debe generar un informe');
            }
        });
    }

    async generarInforme() {
        const fechaInicio = document.getElementById('fecha-inicio').value;
        const fechaFin = document.getElementById('fecha-fin').value;

        if (!validarFechas(fechaInicio, fechaFin)) {
            return;
        }

        try {
            // Convertir fechas a timestamp para la consulta
            const inicio = new Date(fechaInicio);
            inicio.setHours(0, 0, 0, 0);
            
            const fin = new Date(fechaFin);
            fin.setHours(23, 59, 59, 999);

            const ventasRef = collection(db, 'ventas');
            const q = query(
                ventasRef,
                where('fecha', '>=', fechaInicio),
                where('fecha', '<=', fechaFin)
            );

            const snapshot = await getDocs(q);
            const ventas = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            if (ventas.length === 0) {
                this.resultado.innerHTML = '<p class="text-gray-500 text-center py-4">No se encontraron ventas en el período seleccionado</p>';
                this.ventasData = null;
                return;
            }

            // Agrupar ventas por vendedor
            const ventasPorVendedor = this.agruparVentasPorVendedor(ventas);
            this.ventasData = ventasPorVendedor;
            this.mostrarResultados(ventasPorVendedor);

        } catch (error) {
            console.error('Error al generar el informe:', error);
            mostrarError('Error al generar el informe');
        }
    }

    agruparVentasPorVendedor(ventas) {
        const grupos = {};
        let totalGeneral = {
            precioCompra: 0,
            precioVenta: 0,
            utilidad: 0
        };

        // Primero procesar GODSPLAN si existe
        ventas.forEach(venta => {
            if (!grupos[venta.afiliado]) {
                grupos[venta.afiliado] = {
                    ventas: [],
                    totales: {
                        precioCompra: 0,
                        precioVenta: 0,
                        utilidad: 0
                    }
                };
            }

            const utilidad = venta.precioVenta - venta.precioCompra;
            grupos[venta.afiliado].ventas.push({
                ...venta,
                utilidad
            });

            grupos[venta.afiliado].totales.precioCompra += venta.precioCompra;
            grupos[venta.afiliado].totales.precioVenta += venta.precioVenta;
            grupos[venta.afiliado].totales.utilidad += utilidad;

            totalGeneral.precioCompra += venta.precioCompra;
            totalGeneral.precioVenta += venta.precioVenta;
            totalGeneral.utilidad += utilidad;
        });

        // Ordenar los grupos (GODSPLAN primero)
        const gruposOrdenados = {};
        if (grupos['GODSPLAN']) {
            gruposOrdenados['GODSPLAN'] = grupos['GODSPLAN'];
            delete grupos['GODSPLAN'];
        }

        // Agregar el resto de vendedores ordenados alfabéticamente
        Object.keys(grupos)
            .sort()
            .forEach(vendedor => {
                gruposOrdenados[vendedor] = grupos[vendedor];
            });

        return {
            grupos: gruposOrdenados,
            totalGeneral
        };
    }

    mostrarResultados(data) {
        let html = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor/Producto</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Compra</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Venta</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilidad</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
        `;

        // Iterar sobre cada vendedor
        Object.entries(data.grupos).forEach(([vendedor, grupo]) => {
            // Encabezado del vendedor
            html += `
                <tr class="bg-gray-50">
                    <td colspan="5" class="px-6 py-4 font-medium text-gray-900">${vendedor}</td>
                </tr>
            `;

            // Ventas del vendedor
            grupo.ventas.forEach(venta => {
                html += `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${venta.productoNombre}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatearFecha(venta.fecha)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatearMoneda(venta.precioCompra)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatearMoneda(venta.precioVenta)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatearMoneda(venta.utilidad)}</td>
                    </tr>
                `;
            });

            // Subtotal del vendedor
            html += `
                <tr class="bg-gray-100">
                    <td colspan="2" class="px-6 py-4 font-medium text-gray-900">Subtotal ${vendedor}</td>
                    <td class="px-6 py-4 font-medium text-gray-900">${formatearMoneda(grupo.totales.precioCompra)}</td>
                    <td class="px-6 py-4 font-medium text-gray-900">${formatearMoneda(grupo.totales.precioVenta)}</td>
                    <td class="px-6 py-4 font-medium text-gray-900">${formatearMoneda(grupo.totales.utilidad)}</td>
                </tr>
            `;
        });

        // Total general
        html += `
                <tr class="bg-blue-50 font-bold">
                    <td colspan="2" class="px-6 py-4 text-blue-900">TOTAL GENERAL</td>
                    <td class="px-6 py-4 text-blue-900">${formatearMoneda(data.totalGeneral.precioCompra)}</td>
                    <td class="px-6 py-4 text-blue-900">${formatearMoneda(data.totalGeneral.precioVenta)}</td>
                    <td class="px-6 py-4 text-blue-900">${formatearMoneda(data.totalGeneral.utilidad)}</td>
                </tr>
            </tbody>
        </table>
        </div>`;

        this.resultado.innerHTML = html;
    }

    exportarPDF() {
        const doc = new jsPDF('l', 'mm', 'a4'); // 'l' para orientación horizontal
        const fechaInicio = document.getElementById('fecha-inicio').value;
        const fechaFin = document.getElementById('fecha-fin').value;

        // Configuración inicial
        doc.setFontSize(16);
        doc.text('Informe de Ventas', 15, 15);
        
        doc.setFontSize(12);
        doc.text(`Período: ${formatearFecha(fechaInicio)} - ${formatearFecha(fechaFin)}`, 15, 25);

        let y = 35;
        const margenIzquierdo = 15;
        const anchoColumna = 50;

        Object.entries(this.ventasData.grupos).forEach(([vendedor, grupo]) => {
            // Verificar si necesitamos una nueva página
            if (y > 180) {
                doc.addPage();
                y = 15;
            }

            // Nombre del vendedor
            doc.setFont('helvetica', 'bold');
            doc.text(vendedor, margenIzquierdo, y);
            y += 10;

            // Encabezados de columnas
            doc.text('Producto', margenIzquierdo, y);
            doc.text('Fecha', margenIzquierdo + anchoColumna, y);
            doc.text('P. Compra', margenIzquierdo + anchoColumna * 2, y);
            doc.text('P. Venta', margenIzquierdo + anchoColumna * 3, y);
            doc.text('Utilidad', margenIzquierdo + anchoColumna * 4, y);
            y += 7;

            // Datos de ventas
            doc.setFont('helvetica', 'normal');
            grupo.ventas.forEach(venta => {
                if (y > 180) {
                    doc.addPage();
                    y = 15;
                }

                doc.text(venta.productoNombre.substring(0, 20), margenIzquierdo, y);
                doc.text(formatearFecha(venta.fecha), margenIzquierdo + anchoColumna, y);
                doc.text(formatearMoneda(venta.precioCompra), margenIzquierdo + anchoColumna * 2, y);
                doc.text(formatearMoneda(venta.precioVenta), margenIzquierdo + anchoColumna * 3, y);
                doc.text(formatearMoneda(venta.utilidad), margenIzquierdo + anchoColumna * 4, y);
                y += 7;
            });

            // Subtotal del vendedor
            doc.setFont('helvetica', 'bold');
            doc.text(`Subtotal ${vendedor}`, margenIzquierdo, y);
            doc.text(formatearMoneda(grupo.totales.precioCompra), margenIzquierdo + anchoColumna * 2, y);
            doc.text(formatearMoneda(grupo.totales.precioVenta), margenIzquierdo + anchoColumna * 3, y);
            doc.text(formatearMoneda(grupo.totales.utilidad), margenIzquierdo + anchoColumna * 4, y);
            y += 10;
        });

        // Total general
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL GENERAL', margenIzquierdo, y);
        doc.text(formatearMoneda(this.ventasData.totalGeneral.precioCompra), margenIzquierdo + anchoColumna * 2, y);
        doc.text(formatearMoneda(this.ventasData.totalGeneral.precioVenta), margenIzquierdo + anchoColumna * 3, y);
        doc.text(formatearMoneda(this.ventasData.totalGeneral.utilidad), margenIzquierdo + anchoColumna * 4, y);

        // Guardar el PDF
        doc.save(`informe-ventas-${fechaInicio}-${fechaFin}.pdf`);
        mostrarExito('PDF generado exitosamente');
    }

    exportarXLSX() {
        const fechaInicio = document.getElementById('fecha-inicio').value;
        const fechaFin = document.getElementById('fecha-fin').value;
        
        // Preparar los datos para Excel
        const datos = [];

        // Agregar título y período
        datos.push(['Informe de Ventas']);
        datos.push([`Período: ${formatearFecha(fechaInicio)} - ${formatearFecha(fechaFin)}`]);
        datos.push([]); // Línea en blanco

        Object.entries(this.ventasData.grupos).forEach(([vendedor, grupo]) => {
            datos.push([vendedor]); // Nombre del vendedor
            datos.push(['Producto', 'Fecha', 'Precio Compra', 'Precio Venta', 'Utilidad']); // Encabezados

            // Datos de ventas
            grupo.ventas.forEach(venta => {
                datos.push([
                    venta.productoNombre,
                    formatearFecha(venta.fecha),
                    venta.precioCompra,
                    venta.precioVenta,
                    venta.utilidad
                ]);
            });

            // Subtotal del vendedor
            datos.push([
                `Subtotal ${vendedor}`,
                '',
                grupo.totales.precioCompra,
                grupo.totales.precioVenta,
                grupo.totales.utilidad
            ]);
            datos.push([]); // Línea en blanco
        });

        // Total general
        datos.push([
            'TOTAL GENERAL',
            '',
            this.ventasData.totalGeneral.precioCompra,
            this.ventasData.totalGeneral.precioVenta,
            this.ventasData.totalGeneral.utilidad
        ]);

        // Crear libro de trabajo y hoja
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(datos);

        // Agregar la hoja al libro
        XLSX.utils.book_append_sheet(wb, ws, 'Informe de Ventas');

        // Guardar el archivo
        XLSX.writeFile(wb, `informe-ventas-${fechaInicio}-${fechaFin}.xlsx`);
        mostrarExito('Excel generado exitosamente');
    }
}
