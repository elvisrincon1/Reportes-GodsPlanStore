import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export const firebaseConfig = {
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

// Funciones auxiliares para operaciones con Firestore
export const agregarDocumento = async (coleccion, datos) => {
  try {
    const docRef = await addDoc(collection(db, coleccion), {
      ...datos,
      createdAt: new Date()
    });
    return { id: docRef.id, ...datos };
  } catch (error) {
    console.error("Error agregando documento:", error);
    throw error;
  }
};

export const obtenerDocumentos = async (coleccion) => {
  try {
    const querySnapshot = await getDocs(collection(db, coleccion));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error obteniendo documentos:", error);
    throw error;
  }
};

export const actualizarDocumento = async (coleccion, id, datos) => {
  try {
    const docRef = doc(db, coleccion, id);
    await updateDoc(docRef, {
      ...datos,
      updatedAt: new Date()
    });
    return { id, ...datos };
  } catch (error) {
    console.error("Error actualizando documento:", error);
    throw error;
  }
};

export const eliminarDocumento = async (coleccion, id) => {
  try {
    await deleteDoc(doc(db, coleccion, id));
    return true;
  } catch (error) {
    console.error("Error eliminando documento:", error);
    throw error;
  }
};

export const escucharCambios = (coleccion, callback) => {
  return onSnapshot(collection(db, coleccion), (snapshot) => {
    const documentos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(documentos);
  });
};

export const buscarDocumentos = async (coleccion, campo, valor) => {
  try {
    const q = query(
      collection(db, coleccion),
      where(campo, '>=', valor),
      where(campo, '<=', valor + '\uf8ff'),
      orderBy(campo)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error buscando documentos:", error);
    throw error;
  }
};

export { db };
