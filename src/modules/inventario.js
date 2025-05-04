import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, onSnapshot } from 'firebase/firestore';
import { mostrarError, mostrarExito, validarCamposRequeridos, validarPrecios, modal, crearBotonesAccion } from '../utils.js';
import { db } from '../firebase.js';

export default class Inventario {
    constructor() {
        this.form = document.getElementById('inventario-form');
        this.tabla = document.getElementById('productos-table').getElementsByTagName('tbody')[0];
        this.unsubscribe = null;

        this.inicializarEventos();
        this.cargarProductos();
    }

    inicializarEventos() {
        // Manejar el envío del formulario
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarProducto();
        });

        // Validar precio de venta cuando cambie
        const precioVentaInput = document.getElementById('precio-venta');
        const precioCompraInput = document.getElementById('precio-compra');
        
        precioVentaInput.addEventListener('blur', () => {
            if (precioCompraInput.value) {
                validarPrecios(precioCompraInput.value, precioVentaInput.value);
            }
        });

        // Autocompletar proveedores
        this.inicializarAutocompletarProveedores();
    }

    async inicializarAutocompletarProveedores() {
        const proveedor1Input = document.getElementById('proveedor1');
        const proveedor2Input = document.getElementById('proveedor2');

        const configurarAutocompletado = (input) => {
            input.addEventListener('input', async (e) => {
                const busqueda = e.target.value.toLowerCase();
                if (busqueda.length < 2) return;

                try {
                    const proveedoresRef = collection(db, 'proveedores');
                    const snapshot = await getDocs(proveedoresRef);
                    const sugerencias = snapshot.docs
                        .map(doc => doc.data().nombre)
                        .filter(nombre => nombre.toLowerCase().includes(busqueda));

                    this.mostrarSugerenciasProveedor(input, sugerencias);
                } catch (error) {
                    console.error('Error al buscar proveedores:', error);
                }
            });
        };

        configurarAutocompletado(proveedor1Input);
        configurarAutocompletado(proveedor2Input);
    }

    mostrarSugerenciasProveedor(input, sugerencias) {
        // Eliminar lista anterior si existe
        const listaPreviaId = input.id + '-lista';
        const listaPreviaElement = document.getElementById(listaPreviaId);
        if (listaPreviaElement) {
            listaPreviaElement.remove();
        }

        // Crear nueva lista de sugerencias
        const lista = document.createElement('div');
        lista.id = listaPreviaId;
        lista.className = 'absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto';

        sugerencias.forEach(sugerencia => {
            const item = document.createElement('div');
            item.className = 'p-2 hover:bg-gray-100 cursor-pointer';
            item.textContent = sugerencia;
            item.addEventListener('click', () => {
                input.value = sugerencia;
                lista.remove();
            });
            lista.appendChild(item);
        });

        // Insertar lista después del input
        input.parentNode.appendChild(lista);
    }

    async guardarProducto() {
        const producto = {
            nombre: document.getElementById('nombre-producto').value,
            precioCompra: parseFloat(document.getElementById('precio-compra').value),
            precioVenta: parseFloat(document.getElementById('precio-venta').value),
            proveedor1: document.getElementById('proveedor1').value,
            proveedor2: document.getElementById('proveedor2').value || null,
            prefijo: this.nombre.startsWith('AF-')
        };

        if (!validarCamposRequeridos({
            'Nombre del Producto': producto.nombre,
            'Precio de Compra': producto.precioCompra,
            'Precio de Venta': producto.precioVenta,
            'Proveedor 1': producto.proveedor1
        })) {
            return;
        }

        if (!validarPrecios(producto.precioCompra, producto.precioVenta)) {
            return;
        }

        try {
            await addDoc(collection(db, 'inventario'), producto);
            mostrarExito('Producto guardado exitosamente');
            this.form.reset();
        } catch (error) {
            console.error('Error al guardar el producto:', error);
            mostrarError('Error al guardar el producto');
        }
    }

    cargarProductos() {
        // Desuscribir de la escucha anterior si existe
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        // Establecer nueva escucha en tiempo real
        this.unsubscribe = onSnapshot(collection(db, 'inventario'), (snapshot) => {
            this.tabla.innerHTML = '';
            snapshot.forEach(doc => {
                this.agregarFilaProducto(doc.id, doc.data());
            });
        }, (error) => {
            console.error('Error al cargar productos:', error);
            mostrarError('Error al cargar los productos');
        });
    }

    agregarFilaProducto(id, producto) {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';

        // Crear celdas
        const celdas = [
            { texto: producto.nombre },
            { texto: `$${producto.precioCompra.toFixed(2)}` },
            { texto: `$${producto.precioVenta.toFixed(2)}` },
            { texto: producto.proveedor2 ? `${producto.proveedor1}, ${producto.proveedor2}` : producto.proveedor1 },
            {
                contenido: crearBotonesAccion({
                    editar: {
                        icono: 'edit',
                        onClick: () => this.editarProducto(id, producto),
                        clase: 'text-blue-600'
                    },
                    eliminar: {
                        icono: 'trash',
                        onClick: () => this.eliminarProducto(id),
                        clase: 'text-red-600'
                    }
                })
            }
        ];

        // Agregar celdas a la fila
        celdas.forEach(celda => {
            const td = document.createElement('td');
            td.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
            
            if (celda.texto) {
                td.textContent = celda.texto;
            } else if (celda.contenido) {
                td.appendChild(celda.contenido);
            }
            
            tr.appendChild(td);
        });

        this.tabla.appendChild(tr);
    }

    editarProducto(id, producto) {
        const contenidoModal = `
            <div class="p-6">
                <h3 class="text-lg font-semibold mb-4">Editar Producto</h3>
                <form id="editar-producto-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Nombre del Producto</label>
                        <input type="text" id="edit-nombre" value="${producto.nombre}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Precio de Compra</label>
                        <input type="number" id="edit-precio-compra" value="${producto.precioCompra}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Precio de Venta</label>
                        <input type="number" id="edit-precio-venta" value="${producto.precioVenta}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Proveedor 1</label>
                        <input type="text" id="edit-proveedor1" value="${producto.proveedor1}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Proveedor 2</label>
                        <input type="text" id="edit-proveedor2" value="${producto.proveedor2 || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div class="flex justify-end space-x-3">
                        <button type="button" onclick="modal.ocultar()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancelar</button>
                        <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        `;

        modal.mostrar(contenidoModal);

        // Manejar el envío del formulario de edición
        document.getElementById('editar-producto-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const productoActualizado = {
                nombre: document.getElementById('edit-nombre').value,
                precioCompra: parseFloat(document.getElementById('edit-precio-compra').value),
                precioVenta: parseFloat(document.getElementById('edit-precio-venta').value),
                proveedor1: document.getElementById('edit-proveedor1').value,
                proveedor2: document.getElementById('edit-proveedor2').value || null,
                prefijo: document.getElementById('edit-nombre').value.startsWith('AF-')
            };

            if (!validarCamposRequeridos({
                'Nombre del Producto': productoActualizado.nombre,
                'Precio de Compra': productoActualizado.precioCompra,
                'Precio de Venta': productoActualizado.precioVenta,
                'Proveedor 1': productoActualizado.proveedor1
            })) {
                return;
            }

            if (!validarPrecios(productoActualizado.precioCompra, productoActualizado.precioVenta)) {
                return;
            }

            try {
                await updateDoc(doc(db, 'inventario', id), productoActualizado);
                mostrarExito('Producto actualizado exitosamente');
                modal.ocultar();
            } catch (error) {
                console.error('Error al actualizar el producto:', error);
                mostrarError('Error al actualizar el producto');
            }
        });
    }

    async eliminarProducto(id) {
        if (!confirm('¿Está seguro de que desea eliminar este producto?')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'inventario', id));
            mostrarExito('Producto eliminado exitosamente');
        } catch (error) {
            console.error('Error al eliminar el producto:', error);
            mostrarError('Error al eliminar el producto');
        }
    }
}
