import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { mostrarError, mostrarExito, validarCamposRequeridos, formatearFecha, debounce } from '../utils.js';
import { db } from '../firebase.js';

export default class ReportarVenta {
    constructor() {
        this.form = document.getElementById('venta-form');
        this.afiliadoInput = document.getElementById('afiliado');
        this.fechaInput = document.getElementById('fecha');
        this.productoSelect = document.getElementById('producto');
        this.afiliadosList = document.getElementById('afiliados-list');

        this.inicializarEventos();
        this.establecerFechaActual();
    }

    inicializarEventos() {
        // Manejar la búsqueda de afiliados con debounce
        this.afiliadoInput.addEventListener('input', debounce((e) => {
            this.buscarAfiliados(e.target.value);
        }, 300));

        // Manejar la selección de afiliado
        this.afiliadoInput.addEventListener('change', () => {
            this.cargarProductosPorAfiliado(this.afiliadoInput.value);
        });

        // Manejar el envío del formulario
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.reportarVenta();
        });
    }

    establecerFechaActual() {
        const hoy = new Date();
        this.fechaInput.value = hoy.toISOString().split('T')[0];
    }

    async buscarAfiliados(busqueda) {
        if (!busqueda) {
            this.afiliadosList.innerHTML = '';
            this.afiliadosList.classList.add('hidden');
            return;
        }

        try {
            const afiliadosRef = collection(db, 'afiliados');
            const q = query(
                afiliadosRef,
                where('nombre', '>=', busqueda),
                where('nombre', '<=', busqueda + '\uf8ff')
            );

            const querySnapshot = await getDocs(q);
            this.mostrarSugerenciasAfiliados(querySnapshot.docs);
        } catch (error) {
            console.error('Error al buscar afiliados:', error);
            mostrarError('Error al buscar afiliados');
        }
    }

    mostrarSugerenciasAfiliados(afiliados) {
        this.afiliadosList.innerHTML = '';
        
        if (afiliados.length === 0) {
            this.afiliadosList.classList.add('hidden');
            return;
        }

        // Asegurarse que GODSPLAN aparezca primero si está en los resultados
        afiliados.sort((a, b) => {
            if (a.data().nombre === 'GODSPLAN') return -1;
            if (b.data().nombre === 'GODSPLAN') return 1;
            return a.data().nombre.localeCompare(b.data().nombre);
        });

        afiliados.forEach(doc => {
            const afiliado = doc.data();
            const div = document.createElement('div');
            div.className = 'p-2 hover:bg-gray-100 cursor-pointer';
            div.textContent = afiliado.nombre;
            div.addEventListener('click', () => {
                this.afiliadoInput.value = afiliado.nombre;
                this.afiliadosList.classList.add('hidden');
                this.cargarProductosPorAfiliado(afiliado.nombre);
            });
            this.afiliadosList.appendChild(div);
        });

        this.afiliadosList.classList.remove('hidden');
    }

    async cargarProductosPorAfiliado(nombreAfiliado) {
        try {
            const productosRef = collection(db, 'inventario');
            let q;

            if (nombreAfiliado === 'GODSPLAN') {
                // Para GODSPLAN: productos que NO empiezan con "AF-"
                q = query(productosRef, where('prefijo', '==', false));
            } else {
                // Para otros afiliados: solo productos que empiezan con "AF-"
                q = query(productosRef, where('prefijo', '==', true));
            }

            const querySnapshot = await getDocs(q);
            this.actualizarSelectProductos(querySnapshot.docs);
        } catch (error) {
            console.error('Error al cargar productos:', error);
            mostrarError('Error al cargar los productos');
        }
    }

    actualizarSelectProductos(productos) {
        this.productoSelect.innerHTML = '<option value="">Seleccione un producto</option>';
        
        productos.forEach(doc => {
            const producto = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = producto.nombre;
            option.dataset.precioVenta = producto.precioVenta;
            option.dataset.precioCompra = producto.precioCompra;
            this.productoSelect.appendChild(option);
        });
    }

    async reportarVenta() {
        const venta = {
            afiliado: this.afiliadoInput.value,
            fecha: this.fechaInput.value,
            productoId: this.productoSelect.value,
            productoNombre: this.productoSelect.options[this.productoSelect.selectedIndex].text,
            precioVenta: parseFloat(this.productoSelect.options[this.productoSelect.selectedIndex].dataset.precioVenta),
            precioCompra: parseFloat(this.productoSelect.options[this.productoSelect.selectedIndex].dataset.precioCompra),
            timestamp: new Date()
        };

        if (!validarCamposRequeridos({
            'Afiliado': venta.afiliado,
            'Fecha': venta.fecha,
            'Producto': venta.productoId
        })) {
            return;
        }

        try {
            await addDoc(collection(db, 'ventas'), venta);
            mostrarExito('Venta reportada exitosamente');
            this.form.reset();
            this.establecerFechaActual();
        } catch (error) {
            console.error('Error al reportar la venta:', error);
            mostrarError('Error al reportar la venta');
        }
    }
}
