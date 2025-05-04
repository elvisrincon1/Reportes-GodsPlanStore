import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { mostrarError, mostrarExito, validarCamposRequeridos, modal, crearBotonesAccion } from '../utils.js';
import { db } from '../firebase.js';

export default class Proveedores {
    constructor() {
        this.form = document.getElementById('proveedor-form');
        this.lista = document.getElementById('proveedores-list');
        this.unsubscribe = null;

        this.inicializarEventos();
        this.cargarProveedores();
    }

    inicializarEventos() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarProveedor();
        });
    }

    async guardarProveedor() {
        const proveedor = {
            nombre: document.getElementById('nombre-proveedor').value.trim(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        if (!validarCamposRequeridos({
            'Nombre del Proveedor': proveedor.nombre
        })) {
            return;
        }

        try {
            await addDoc(collection(db, 'proveedores'), proveedor);
            mostrarExito('Proveedor guardado exitosamente');
            this.form.reset();
        } catch (error) {
            console.error('Error al guardar el proveedor:', error);
            mostrarError('Error al guardar el proveedor');
        }
    }

    cargarProveedores() {
        // Desuscribir de la escucha anterior si existe
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        // Establecer nueva escucha en tiempo real
        this.unsubscribe = onSnapshot(collection(db, 'proveedores'), (snapshot) => {
            this.lista.innerHTML = '';
            snapshot.docs
                .sort((a, b) => a.data().nombre.localeCompare(b.data().nombre))
                .forEach(doc => {
                    this.agregarTarjetaProveedor(doc.id, doc.data());
                });
        }, (error) => {
            console.error('Error al cargar proveedores:', error);
            mostrarError('Error al cargar los proveedores');
        });
    }

    agregarTarjetaProveedor(id, proveedor) {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'bg-white rounded-lg shadow-md p-4 flex justify-between items-center';
        
        const info = document.createElement('div');
        info.className = 'flex-grow';
        
        const nombre = document.createElement('h3');
        nombre.className = 'text-lg font-semibold text-gray-800';
        nombre.textContent = proveedor.nombre;
        
        const fecha = document.createElement('p');
        fecha.className = 'text-sm text-gray-500';
        fecha.textContent = `Registrado: ${new Date(proveedor.createdAt.seconds * 1000).toLocaleDateString()}`;
        
        info.appendChild(nombre);
        info.appendChild(fecha);
        
        const acciones = crearBotonesAccion({
            editar: {
                icono: 'edit',
                onClick: () => this.editarProveedor(id, proveedor),
                clase: 'text-blue-600'
            },
            eliminar: {
                icono: 'trash',
                onClick: () => this.eliminarProveedor(id),
                clase: 'text-red-600'
            }
        });
        
        tarjeta.appendChild(info);
        tarjeta.appendChild(acciones);
        
        this.lista.appendChild(tarjeta);
    }

    editarProveedor(id, proveedor) {
        const contenidoModal = `
            <div class="p-6">
                <h3 class="text-lg font-semibold mb-4">Editar Proveedor</h3>
                <form id="editar-proveedor-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Nombre del Proveedor</label>
                        <input type="text" id="edit-nombre-proveedor" value="${proveedor.nombre}" 
                               class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    </div>
                    <div class="flex justify-end space-x-3">
                        <button type="button" onclick="modal.ocultar()" 
                                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">
                            Cancelar
                        </button>
                        <button type="submit" 
                                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        `;

        modal.mostrar(contenidoModal);

        // Manejar el envío del formulario de edición
        document.getElementById('editar-proveedor-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const nombreActualizado = document.getElementById('edit-nombre-proveedor').value.trim();

            if (!validarCamposRequeridos({
                'Nombre del Proveedor': nombreActualizado
            })) {
                return;
            }

            try {
                await updateDoc(doc(db, 'proveedores', id), {
                    nombre: nombreActualizado,
                    updatedAt: new Date()
                });
                
                mostrarExito('Proveedor actualizado exitosamente');
                modal.ocultar();
            } catch (error) {
                console.error('Error al actualizar el proveedor:', error);
                mostrarError('Error al actualizar el proveedor');
            }
        });
    }

    async eliminarProveedor(id) {
        if (!confirm('¿Está seguro de que desea eliminar este proveedor?')) {
            return;
        }

        try {
            // Verificar si el proveedor está siendo usado en productos
            const productosRef = collection(db, 'inventario');
            const snapshot = await getDocs(productosRef);
            const productoConProveedor = snapshot.docs.find(doc => {
                const producto = doc.data();
                return producto.proveedor1 === id || producto.proveedor2 === id;
            });

            if (productoConProveedor) {
                mostrarError('No se puede eliminar el proveedor porque está siendo usado en productos');
                return;
            }

            await deleteDoc(doc(db, 'proveedores', id));
            mostrarExito('Proveedor eliminado exitosamente');
        } catch (error) {
            console.error('Error al eliminar el proveedor:', error);
            mostrarError('Error al eliminar el proveedor');
        }
    }

    destruir() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}
