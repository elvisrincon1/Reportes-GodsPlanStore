// Función para mostrar mensajes de error
export const mostrarError = (mensaje) => {
    const alertaError = document.createElement('div');
    alertaError.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded shadow-lg z-50 animate-fade-in-down';
    alertaError.textContent = mensaje;
    document.body.appendChild(alertaError);
    setTimeout(() => {
        alertaError.remove();
    }, 3000);
};

// Función para mostrar mensajes de éxito
export const mostrarExito = (mensaje) => {
    const alertaExito = document.createElement('div');
    alertaExito.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded shadow-lg z-50 animate-fade-in-down';
    alertaExito.textContent = mensaje;
    document.body.appendChild(alertaExito);
    setTimeout(() => {
        alertaExito.remove();
    }, 3000);
};

// Función para formatear fechas
export const formatearFecha = (fecha) => {
    if (!fecha) return '';
    const f = new Date(fecha);
    return f.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

// Función para formatear moneda
export const formatearMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD'
    }).format(cantidad);
};

// Función para validar campos requeridos
export const validarCamposRequeridos = (campos) => {
    for (const [campo, valor] of Object.entries(campos)) {
        if (!valor || valor.trim() === '') {
            mostrarError(`El campo ${campo} es requerido`);
            return false;
        }
    }
    return true;
};

// Función para manejar el modal
export const modal = {
    elemento: null,
    contenido: null,
    
    inicializar() {
        this.elemento = document.getElementById('modal');
        this.contenido = document.getElementById('modal-content');
    },
    
    mostrar(contenidoHTML) {
        if (!this.elemento || !this.contenido) this.inicializar();
        this.contenido.innerHTML = contenidoHTML;
        this.elemento.classList.remove('hidden');
    },
    
    ocultar() {
        if (!this.elemento) this.inicializar();
        this.elemento.classList.add('hidden');
        this.contenido.innerHTML = '';
    }
};

// Función debounce para búsquedas
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Función para validar precios
export const validarPrecios = (precioCompra, precioVenta) => {
    const compra = parseFloat(precioCompra);
    const venta = parseFloat(precioVenta);
    
    if (isNaN(compra) || isNaN(venta)) {
        mostrarError('Los precios deben ser números válidos');
        return false;
    }
    
    if (venta <= compra) {
        mostrarError('El precio de venta debe ser mayor al precio de compra');
        return false;
    }
    
    return true;
};

// Función para crear elementos de tabla
export const crearFilaTabla = (datos, columnas) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50';
    
    columnas.forEach(columna => {
        const td = document.createElement('td');
        td.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
        
        if (typeof columna === 'function') {
            td.appendChild(columna(datos));
        } else {
            td.textContent = datos[columna] || '';
        }
        
        tr.appendChild(td);
    });
    
    return tr;
};

// Función para crear botones de acción
export const crearBotonesAccion = (acciones) => {
    const contenedor = document.createElement('div');
    contenedor.className = 'flex space-x-2';
    
    Object.entries(acciones).forEach(([nombre, { icono, onClick, clase }]) => {
        const boton = document.createElement('button');
        boton.className = `p-1 rounded-full hover:bg-gray-100 ${clase || ''}`;
        boton.innerHTML = `<i class="fas fa-${icono}"></i>`;
        boton.onclick = onClick;
        contenedor.appendChild(boton);
    });
    
    return contenedor;
};

// Función para validar fechas
export const validarFechas = (fechaInicio, fechaFin) => {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
        mostrarError('Las fechas no son válidas');
        return false;
    }
    
    if (inicio > fin) {
        mostrarError('La fecha de inicio debe ser anterior a la fecha final');
        return false;
    }
    
    return true;
};

// Función para calcular utilidad
export const calcularUtilidad = (precioVenta, precioCompra) => {
    return parseFloat(precioVenta) - parseFloat(precioCompra);
};

// Función para limpiar formulario
export const limpiarFormulario = (formId) => {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.value = '';
        });
    }
};

// Animaciones para elementos
export const animaciones = {
    fadeIn: (elemento) => {
        elemento.style.opacity = '0';
        elemento.style.display = 'block';
        setTimeout(() => {
            elemento.style.opacity = '1';
            elemento.style.transition = 'opacity 0.3s ease-in-out';
        }, 10);
    },
    
    fadeOut: (elemento, callback) => {
        elemento.style.opacity = '0';
        elemento.style.transition = 'opacity 0.3s ease-in-out';
        setTimeout(() => {
            elemento.style.display = 'none';
            if (callback) callback();
        }, 300);
    }
};
