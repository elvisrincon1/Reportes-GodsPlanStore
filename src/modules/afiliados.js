import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDocs } from 'firebase/firestore';
import { mostrarError, mostrarExito, validarCamposRequeridos, modal, crearBotonesAccion } from '../utils.js';
import { db } from '../firebase.js';

export default class Afiliados {
    constructor() {
        this.form = document.getElementById('afiliado-form');
        this.lista = document.getElementById('afiliados-list-table');
        this.unsubscribe = null;

        this.inicializarEventos();
        this.cargarAfiliados();
    }

    inicializarEventos() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarAfiliado();
        });
    }

    async guardarAfiliado() {
        const afiliado = {
            nombre: document.getElementById('nombre-afiliado').value.trim(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        if (!validarCamposRequeridos({
            'Nombre del Afiliado': afiliado.nombre
        })) {
            return;
        }

        try {
            // Verificar si ya existe un afiliado con el mismo nombre
            const afiliadosRef = collection(db, 'afiliados');
            const snapshot = await getDocs(afiliadosRef);
            const existeAfiliado = snapshot.docs.some(doc => 
                doc.data().nombre.toLowerCase() === afiliado.nombre.toLowerCase()
            );

            if (existeAfiliado) {
                mostrarError('Ya existe un afiliado con este nombre');
                return;
            }

            await addDoc(collection(db, 'afiliados'), afiliado);
            mostrarExito('Afiliado guardado exitosamente');
            this.form.reset();
        } catch (error) {
            console.error('Error al guardar el afiliado:', error);
            mostrarError('Error al guardar el afiliado');
        }
    }

    cargarAfiliados() {
        // Desuscribir de la escucha anterior si existe
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        // Establecer nueva escucha en tiempo real
        this.unsubscribe = onSnapshot(collection(db, 'afiliados'), (snapshot) => {
            this.lista.innerHTML = '';
            
            // Ordenar afiliados: GODSPLAN primero, luego el resto alfabéticamente
            const afiliados = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            afiliados.sort((a, b) => {
                if (a.nombre === 'GODSPLAN') return -1;
                if (b.nombre === 'GODSPLAN') return 1;
                return a.nombre.localeCompare(b.nombre);
            });

            afiliados.forEach(afiliado => {
                this.agregarTarjetaAfiliado(afiliado.id, afiliado);
            });
        }, (error) => {
            console.error('Error al cargar afiliados:', error);
            mostrarError('Error al cargar los afiliados');
        });
    }

    agregarTarjetaAfiliado(id, afiliado) {
        const tarjeta = document.createElement('div');
        tarjeta.className = `bg-white rounded-lg shadow-md p-4 flex justify-between items-center 
                           ${afiliado.nombre === 'GODSPLAN' ? 'border-2 border-blue-500' : ''}`;
        
        const info = document.createElement('div');
        info.className = 'flex-grow';
        
        const nombre = document.createElement('h3');
        nombre.className = `text-lg font-semibold ${afiliado.nombre === 'GODSPLAN' ? 'text-blue-600' : 'text-gray-800'}`;
        nombre.textContent = afiliado.nombre;
        
        const fecha = document.createElement('p');
        fecha.className = 'text-sm text-gray-500';
        fecha.textContent = `Registrado: ${new Date(afiliado.createdAt.seconds * 1000).toLocaleDateString()}`;
        
        info.appendChild(nombre);
        info.appendChild(fecha);
        
        const acciones = crearBotonesAccion({
            editar: {
                icono: 'edit',
                onClick: () => this.editarAfiliado(id, afiliado),
                clase: 'text-blue-600'
            },
            eliminar: {
                icono: 'trash',
                onClick: () => this.eliminarAfiliado(id, afiliado.nombre),
                clase: 'text-red-600'
            }
        });
        
        tarjeta.appendChild(info);
        tarjeta.appendChild(acciones);
        
        this.lista.appendChild(tarjeta);
    }

    editarAfiliado(id, afiliado) {
        const contenidoModal = `
            <div class="p-6">
                <h3 class="text-lg font-semibold mb-4">Editar Afiliado</h3>
                <form id="editar-afiliado-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Nombre del Afiliado</label>
                        <input type="text" id="edit-nombre-afiliado" value="${afiliado.nombre}" 
                               class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                               ${afiliado.nombre === 'GODSPLAN' ? 'disabled' : ''}>
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
        document.getElementById('editar-afiliado-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const nombreActualizado = document.getElementById('edit-nombre-afiliado').value.trim();

            if (!validarCamposRequeridos({
                'Nombre del Afiliado': nombreActualizado
            })) {
                return;
            }

            // No permitir editar GODSPLAN
            if (afiliado.nombre === 'GODSPLAN') {
                mostrarError('No se puede modificar el afiliado GODSPLAN');
                return;
            }

            try {
                // Verificar si ya existe otro afiliado con el mismo nombre
                const afiliadosRef = collection(db, 'afiliados');
                const snapshot = await getDocs(afiliadosRef);
                const existeAfiliado = snapshot.docs.some(doc => 
                    doc.id !== id && doc.data().nombre.toLowerCase() === nombreActualizado.toLowerCase()
                );

                if (existeAfiliado) {
                    mostrarError('Ya existe un afiliado con este nombre');
                    return;
                }

                await updateDoc(doc(db, 'afiliados', id), {
                    nombre: nombreActualizado,
                    updatedAt: new Date()
                });
                
                mostrarExito('Afiliado actualizado exitosamente');
                modal.ocultar();
            } catch (error) {
                console.error('Error al actualizar el afiliado:', error);
                mostrarError('Error al actualizar el afiliado');
            }
        });
    }

    async eliminarAfiliado(id, nombre) {
        // No permitir eliminar GODSPLAN
        if (nombre === 'GODSPLAN') {
            mostrarError('No se puede eliminar el afiliado GODSPLAN');
            return;
        }

        if (!confirm('¿Está seguro de que desea eliminar este afiliado?')) {
            return;
        }

        try {
            // Verificar si el afiliado tiene ventas registradas
            const ventasRef = collection(db, 'ventas');
            const snapshot = await getDocs(ventasRef);
            const tieneVentas = snapshot.docs.some(doc => doc.data().afiliado === nombre);

            if (tieneVentas) {
                mostrarError('No se puede eliminar el afiliado porque tiene ventas registradas');
                return;
            }

            await deleteDoc(doc(db, 'afiliados', id));
            mostrarExito('Afiliado eliminado exitosamente');
        } catch (error) {
            console.error('Error al eliminar el afiliado:', error);
            mostrarError('Error al eliminar el afiliado');
        }
    }

    destruir() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}
