import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { mostrarError, mostrarExito } from './utils.js';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCR8b79Iv9r0i-pJ2-YBjo8WkuMPbwkvnc",
  authDomain: "reportes-godsplanstore.firebaseapp.com",
  projectId: "reportes-godsplanstore",
  storageBucket: "reportes-godsplanstore.firebasestorage.app",
  messagingSenderId: "176028115711",
  appId: "1:176028115711:web:0506459464cb95e0e0a2ca",
  measurementId: "G-3JW6NSHHBB"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Función para manejar la navegación
const inicializarNavegacion = () => {
    const secciones = document.querySelectorAll('.section');
    const botones = document.querySelectorAll('.nav-btn');

    // Mostrar la primera sección por defecto
    if (secciones.length > 0) {
        secciones[0].classList.add('active');
    }

    botones.forEach(boton => {
        boton.addEventListener('click', () => {
            const seccionId = boton.dataset.section;
            
            // Ocultar todas las secciones
            secciones.forEach(seccion => {
                seccion.classList.remove('active');
            });

            // Mostrar la sección seleccionada
            const seccionActiva = document.getElementById(seccionId);
            if (seccionActiva) {
                seccionActiva.classList.add('active');
            }

            // Actualizar estado de los botones
            botones.forEach(b => b.classList.remove('bg-blue-700'));
            boton.classList.add('bg-blue-700');
        });
    });
};

// Función para inicializar los módulos
const inicializarModulos = async () => {
    try {
        // Importar módulos dinámicamente
        const [
            { default: ReportarVenta },
            { default: Inventario },
            { default: Proveedores },
            { default: Afiliados },
            { default: Informe }
        ] = await Promise.all([
            import('./modules/reportarVenta.js'),
            import('./modules/inventario.js'),
            import('./modules/proveedores.js'),
            import('./modules/afiliados.js'),
            import('./modules/informe.js')
        ]);

        // Inicializar cada módulo
        new ReportarVenta(db);
        new Inventario(db);
        new Proveedores(db);
        new Afiliados(db);
        new Informe(db);

        mostrarExito('Módulos inicializados correctamente');
    } catch (error) {
        console.error('Error al cargar los módulos:', error);
        mostrarError('Error al inicializar los módulos');
    }
};

// Función para inicializar la aplicación
const inicializarApp = async () => {
    try {
        inicializarNavegacion();
        await inicializarModulos();
        mostrarExito('Aplicación inicializada correctamente');
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        mostrarError('Error al inicializar la aplicación');
    }
};

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarApp);

// Manejador global de errores
window.onerror = (mensaje, archivo, linea, columna, error) => {
    console.error('Error global:', { mensaje, archivo, linea, columna, error });
    mostrarError('Ha ocurrido un error inesperado');
    return false;
};

export { db };
