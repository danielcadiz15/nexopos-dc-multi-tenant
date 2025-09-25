// src/contexts/AuthContext.js - VERSION MEJORADA CON PERMISOS GRANULARES

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  getIdToken 
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { toast } from 'react-toastify';
import sucursalesService from '../services/sucursales.service';

const AuthContext = createContext();
const SUPER_ADMIN_EMAIL = 'danielcadiz15@gmail.com';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orgId, setOrgId] = useState(null);
  const uoUnsubRef = useRef(null);
  
  // Estado para sucursal seleccionada
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState(null);
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState([]);
  const [loadingSucursales, setLoadingSucursales] = useState(false);

  // NUEVO: Estado para permisos efectivos
  const [permisosEfectivos, setPermisosEfectivos] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Obtener custom claims (roles)
          const tokenResult = await firebaseUser.getIdTokenResult();
          const customClaims = tokenResult.claims;

          // Establecer orgId inmediatamente desde claims/localStorage (fallback) para evitar redirección temprana
          try {
            const claimCompanyId = customClaims?.companyId || null;
            const storedCompanyId = localStorage.getItem('companyId');
            const initialOrgId = claimCompanyId || storedCompanyId || null;
            if (initialOrgId) {
              setOrgId(initialOrgId);
              if (claimCompanyId) localStorage.setItem('companyId', claimCompanyId);
            }
          } catch {}
          
          // Obtener datos adicionales del usuario desde Firestore
          let userData = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            nombre: customClaims.nombre || firebaseUser.displayName || 'Usuario',
            apellido: customClaims.apellido || '',
            rol: customClaims.rol || 'Usuario',
            rolId: customClaims.rolId || '1',
            permisos: customClaims.permisos || {},
            activo: customClaims.activo !== false,
            customClaims: customClaims,
            sucursales: customClaims.sucursales || []
          };

          // Suscribirse en tiempo real a usuariosOrg/{uid} para reflejar orgId al instante
          try {
            if (uoUnsubRef.current) {
              uoUnsubRef.current();
              uoUnsubRef.current = null;
            }
            const uoRef = doc(db, 'usuariosOrg', firebaseUser.uid);
            uoUnsubRef.current = onSnapshot(uoRef, async (snap) => {
              if (snap.exists()) {
                const data = snap.data();
                const newOrgId = data.orgId || null;
                setOrgId(newOrgId);
                // Guardar en localStorage para que los servicios puedan acceder
                if (newOrgId) {
                  localStorage.setItem('orgId', newOrgId);
                } else {
                  localStorage.removeItem('orgId');
                }
              } else {
                // AUTOMÁTICO: Si el usuario no tiene empresa, crear una automáticamente
                try {
                  console.log('🏢 [AUTH] Usuario sin empresa, creando automáticamente...');
                  const { getFunctions, httpsCallable } = await import('firebase/functions');
                  const functions = getFunctions();
                  const createTenant = httpsCallable(functions, 'createTenant');
                  
                  const result = await createTenant({
                    nombre: firebaseUser.email.split('@')[1].split('.')[0].toUpperCase()
                  });
                  
                  if (result.data.success) {
                    console.log('✅ [AUTH] Empresa creada automáticamente en login:', result.data.orgId);
                    setOrgId(result.data.orgId);
                    localStorage.setItem('orgId', result.data.orgId);
                  }
                } catch (tenantError) {
                  console.warn('⚠️ [AUTH] No se pudo crear empresa automáticamente en login:', tenantError.message);
                  setOrgId(null);
                }
              }
            }, (e) => {
              console.warn('⚠️ [AUTH] Snapshot usuariosOrg error:', e.message);
              setOrgId(null);
            });
          } catch (e) {
            console.warn('⚠️ [AUTH] No se pudo suscribir a usuariosOrg:', e.message);
            setOrgId(null);
          }
          
          // MEJORADO: Intentar obtener datos mas completos desde Firestore (solo si tenemos orgId)
          if (orgId) {
            try {
              const userDoc = await doc(db, 'companies', orgId, 'usuarios', firebaseUser.uid);
              const userSnapshot = await getDoc(userDoc);
              
              if (userSnapshot.exists()) {
                const firestoreData = userSnapshot.data();
                console.log('?? [AUTH] Datos de Firestore:', firestoreData);
                
                // Combinar datos de custom claims con Firestore
                userData = {
                  ...userData,
                  nombre: firestoreData.nombre || userData.nombre,
                  apellido: firestoreData.apellido || userData.apellido,
                  rol: firestoreData.rol || userData.rol,
                  rolId: firestoreData.rol_id || userData.rolId,
                  permisos: firestoreData.permisos || userData.permisos,
                  sucursales: firestoreData.sucursales || userData.sucursales,
                  activo: firestoreData.activo !== false
                };
              }
            } catch (firestoreError) {
              console.warn('?? [AUTH] No se pudieron obtener datos de Firestore:', firestoreError.message);
            }
          } else {
            console.log('?? [AUTH] No hay orgId disponible, saltando consulta a Firestore');
          }
          
          console.log('? [AUTH] Usuario autenticado:', {
            id: userData.id,
            email: userData.email,
            nombre: userData.nombre,
            rol: userData.rol,
            permisosCount: Object.keys(userData.permisos).length,
            orgId: orgId
          });
          
          setCurrentUser(userData);
          setIsAuthenticated(true);
          
          // Calcular permisos efectivos
          await calcularPermisosEfectivos(userData, orgId);
          
          // Cargar sucursales disponibles para el usuario
          console.log('🏢 [AUTH] Llamando a cargarSucursalesUsuario...');
          await cargarSucursalesUsuario(userData);
          console.log('🏢 [AUTH] cargarSucursalesUsuario completado');
          
        } catch (error) {
          console.error('? [AUTH] Error obteniendo datos de usuario:', error);
          setCurrentUser(null);
          setIsAuthenticated(false);
          setPermisosEfectivos({});
          setOrgId(null);
        }
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
        setSucursalSeleccionada(null);
        setSucursalesDisponibles([]);
        setPermisosEfectivos({});
        setOrgId(null);
        localStorage.removeItem('orgId');
        localStorage.removeItem('sucursalSeleccionada');
        if (uoUnsubRef.current) {
          uoUnsubRef.current();
          uoUnsubRef.current = null;
        }
      }
      setLoading(false);
    });

    return () => {
      if (uoUnsubRef.current) {
        uoUnsubRef.current();
        uoUnsubRef.current = null;
      }
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (orgId) {
        localStorage.setItem('orgId', orgId);
        localStorage.setItem('companyId', orgId);
      } else {
        localStorage.removeItem('orgId');
        localStorage.removeItem('companyId');
      }
    } catch (storageError) {
      console.warn('[AUTH] No se pudo sincronizar orgId en localStorage:', storageError);
    }
  }, [orgId]);

  // Efecto para recargar sucursales cuando cambie el orgId
  useEffect(() => {
    if (currentUser && orgId && isAuthenticated) {
      console.log('[AUTH] orgId cambió, recargando sucursales…', { orgId, userId: currentUser.id });
      cargarSucursalesUsuario(currentUser);
    }
  }, [orgId, currentUser?.id, isAuthenticated]);

  /**
   * Calcula los permisos efectivos del usuario considerando configuración de módulos
   * @param {Object} usuario - Datos del usuario
   * @param {string} orgId - ID de la empresa
   */
  const calcularPermisosEfectivos = async (usuario, orgId) => {
    try {
      console.log('🔐 [AUTH] Calculando permisos efectivos para usuario:', {
        id: usuario?.id,
        email: usuario?.email,
        rol: usuario?.rol,
        rolId: usuario?.rolId
      });
      
      // Permisos base segun el rol
      let permisosBase = {};
      const rolesArray = Array.isArray(usuario?.roles) ? usuario.roles : [];
      const esOwner = usuario?.customClaims?.role === 'owner' || rolesArray.includes('OWNER');
      const esSuperAdmin = (usuario?.email || '').toLowerCase() === SUPER_ADMIN_EMAIL;
      const esAdministrador = usuario.rol === 'Administrador' || usuario.rol === 'admin' || usuario.rol === 'Admin' || usuario.rolId === 'admin';

      if (esAdministrador || esOwner || esSuperAdmin) {
        console.log('🔐 [AUTH] Usuario es administrador, asignando todos los permisos');
        // Administrador tiene todos los permisos
        permisosBase = {
          productos: { ver: true, crear: true, editar: true, eliminar: true },
          categorias: { ver: true, crear: true, editar: true, eliminar: true },
          proveedores: { ver: true, crear: true, editar: true, eliminar: true },
          compras: { ver: true, crear: true, editar: true, eliminar: true },
          ventas: { ver: true, crear: true, editar: true, eliminar: true },
          stock: { ver: true, crear: true, editar: true, eliminar: true },
          reportes: { ver: true, crear: true, editar: true, eliminar: true },
          promociones: { ver: true, crear: true, editar: true, eliminar: true },
          usuarios: { ver: true, crear: true, editar: true, eliminar: true },
          sucursales: { ver: true, crear: true, editar: true, eliminar: true },
          materias_primas: { ver: true, crear: true, editar: true, eliminar: true },
          recetas: { ver: true, crear: true, editar: true, eliminar: true },
          produccion: { ver: true, crear: true, editar: true, eliminar: true },
          // NUEVOS MODULOS
          clientes: { ver: true, crear: true, editar: true, eliminar: true },
          caja: { ver: true, crear: true, editar: true, eliminar: true },
          gastos: { ver: true, crear: true, editar: true, eliminar: true },
          devoluciones: { ver: true, crear: true, editar: true, eliminar: true },
          listas_precios: { ver: true, crear: true, editar: true, eliminar: true },
          transferencias: { ver: true, crear: true, editar: true, eliminar: true },
          auditoria: { ver: true, crear: true, editar: true, eliminar: true },
          configuracion: { ver: true, crear: true, editar: true, eliminar: true },
          vehiculos: { ver: true, crear: true, editar: true, eliminar: true }
        };
      } else if (usuario.rol === 'Gerente' || usuario.rolId === 'gerente') {
        console.log('🔐 [AUTH] Usuario es gerente, asignando permisos limitados');
        // Gerente tiene permisos limitados
        permisosBase = {
          productos: { ver: true, crear: true, editar: true, eliminar: false },
          categorias: { ver: true, crear: true, editar: true, eliminar: false },
          proveedores: { ver: true, crear: true, editar: true, eliminar: false },
          compras: { ver: true, crear: true, editar: true, eliminar: false },
          ventas: { ver: true, crear: true, editar: true, eliminar: false },
          stock: { ver: true, crear: true, editar: true, eliminar: false },
          reportes: { ver: true, crear: true, editar: true, eliminar: false },
          promociones: { ver: true, crear: true, editar: true, eliminar: false },
          usuarios: { ver: true, crear: false, editar: false, eliminar: false },
          sucursales: { ver: true, crear: false, editar: false, eliminar: false },
          materias_primas: { ver: true, crear: true, editar: true, eliminar: false },
          recetas: { ver: true, crear: true, editar: true, eliminar: false },
          produccion: { ver: true, crear: true, editar: true, eliminar: false },
          // NUEVOS MODULOS
          clientes: { ver: true, crear: true, editar: true, eliminar: false },
          caja: { ver: true, crear: true, editar: true, eliminar: false },
          gastos: { ver: true, crear: true, editar: false, eliminar: false },
          devoluciones: { ver: true, crear: true, editar: true, eliminar: false },
          listas_precios: { ver: true, crear: false, editar: false, eliminar: false },
          transferencias: { ver: true, crear: true, editar: false, eliminar: false },
          auditoria: { ver: false, crear: false, editar: false, eliminar: false },
          configuracion: { ver: true, crear: false, editar: false, eliminar: false },
          vehiculos: { ver: false, crear: false, editar: false, eliminar: false }
        };
      } else {
        console.log('🔐 [AUTH] Usuario es empleado, asignando permisos básicos');
               // Empleado tiene permisos basicos
        permisosBase = {
           productos: { ver: true, crear: true, editar: true, eliminar: false },
           categorias: { ver: true, crear: true, editar: true, eliminar: false },
          proveedores: { ver: true, crear: false, editar: false, eliminar: false },
          compras: { ver: true, crear: false, editar: false, eliminar: false },
           ventas: { ver: true, crear: true, editar: false, eliminar: false },
           stock: { ver: true, crear: false, editar: false, eliminar: false, control: { ver: true, crear: true, editar: false, eliminar: false } },
           reportes: { ver: false, crear: false, editar: false, eliminar: false },
           promociones: { ver: true, crear: false, editar: false, eliminar: false },
           usuarios: { ver: false, crear: false, editar: false, eliminar: false },
           sucursales: { ver: true, crear: false, editar: false, eliminar: false },
           materias_primas: { ver: true, crear: true, editar: true, eliminar: false },
           recetas: { ver: true, crear: true, editar: true, eliminar: false },
           produccion: { ver: true, crear: true, editar: false, eliminar: false },
           // NUEVOS MODULOS
           clientes: { ver: true, crear: true, editar: true, eliminar: false },
           caja: { ver: true, crear: true, editar: false, eliminar: false },
           gastos: { ver: false, crear: false, editar: false, eliminar: false },
           devoluciones: { ver: true, crear: false, editar: false, eliminar: false },
           listas_precios: { ver: true, crear: false, editar: false, eliminar: false },
           transferencias: { ver: false, crear: false, editar: false, eliminar: false },
           auditoria: { ver: false, crear: false, editar: false, eliminar: false },
           configuracion: { ver: true, crear: false, editar: false, eliminar: false },
           vehiculos: { ver: false, crear: false, editar: false, eliminar: false }
         };
      }
      
      // NUEVO: Consultar configuración de módulos desde Firestore
      let modulosHabilitados = {};
      if (orgId) {
        try {
          console.log('🔐 [AUTH] Consultando configuración de módulos para orgId:', orgId);
          const modulesDoc = await doc(db, 'companies', orgId, 'config', 'modules');
          const modulesSnapshot = await getDoc(modulesDoc);
          
          if (modulesSnapshot.exists()) {
            modulosHabilitados = modulesSnapshot.data();
            console.log('🔐 [AUTH] Módulos habilitados en Firestore:', modulosHabilitados);
          } else {
            console.log('🔐 [AUTH] No se encontró configuración de módulos, usando todos habilitados');
            // Si no existe configuración, habilitar todos los módulos por defecto
            modulosHabilitados = {
              productos: true, categorias: true, compras: true, ventas: true, stock: true,
              reportes: true, promociones: true, usuarios: true, sucursales: true,
              materias_primas: true, recetas: true, produccion: true, clientes: true,
              caja: true, gastos: true, devoluciones: true, listas_precios: true,
              transferencias: true, auditoria: true, configuracion: true
            };
          }
        } catch (error) {
          console.warn('🔐 [AUTH] Error consultando configuración de módulos:', error.message);
          // En caso de error, habilitar todos los módulos por defecto
          modulosHabilitados = {
            productos: true, categorias: true, compras: true, ventas: true, stock: true,
            reportes: true, promociones: true, usuarios: true, sucursales: true,
            materias_primas: true, recetas: true, produccion: true, clientes: true,
            caja: true, gastos: true, devoluciones: true, listas_precios: true,
            transferencias: true, auditoria: true, configuracion: true
          };
        }
      }
      
      // Combinar con permisos personalizados
      const permisosPersonalizados = usuario.permisos || {};
      const permisosFinales = { ...permisosBase };
      
      // Los permisos personalizados sobrescriben los del rol
      Object.keys(permisosPersonalizados).forEach(modulo => {
        if (permisosPersonalizados[modulo]) {
          permisosFinales[modulo] = {
            ...permisosFinales[modulo],
            ...permisosPersonalizados[modulo]
          };
        }
      });
      
      // NUEVO: Aplicar filtro de módulos habilitados
      Object.keys(permisosFinales).forEach(modulo => {
        if (modulosHabilitados[modulo] === false) {
          console.log(`🔐 [AUTH] Módulo ${modulo} deshabilitado en configuración, removiendo permisos`);
          permisosFinales[modulo] = { ver: false, crear: false, editar: false, eliminar: false };
        }
      });
      
      // TEMPORAL: Forzar habilitación de compras para usuarios básicos
      if (usuario.rolId === '1' && permisosFinales.compras) {
        console.log('🔐 [AUTH] TEMPORAL: Forzando habilitación de compras para usuario básico');
        permisosFinales.compras.ver = true;
      }
      
      console.log('🔐 [AUTH] Permisos efectivos calculados:', permisosFinales);
      setPermisosEfectivos(permisosFinales);
      
    } catch (error) {
      console.error('❌ [AUTH] Error al calcular permisos efectivos:', error);
      // En caso de error, asignar permisos mínimos
      setPermisosEfectivos({
        productos: { ver: true, crear: false, editar: false, eliminar: false },
        ventas: { ver: true, crear: true, editar: false, eliminar: false }
      });
    }
  };

  /**
   * Cargar sucursales disponibles para el usuario
   */
  const cargarSucursalesUsuario = async (usuario) => {
    try {
      console.log('🏢 [AUTH] INICIANDO cargarSucursalesUsuario para usuario:', {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        rolId: usuario.rolId,
        orgId: orgId
      });
      
      setLoadingSucursales(true);
      
      let sucursales = [];
      
      if (usuario.rol === 'Administrador' || usuario.rol === 'admin' || usuario.rol === 'Admin' || usuario.rolId === 'admin') {
        // Administrador puede ver todas las sucursales
        console.log('🏢 [AUTH] Usuario es administrador, obteniendo todas las sucursales activas');
        sucursales = await sucursalesService.obtenerActivas();
      } else if (usuario.sucursales && usuario.sucursales.length > 0) {
        // Usuario normal solo ve sus sucursales asignadas
        console.log('🏢 [AUTH] Usuario tiene sucursales asignadas:', usuario.sucursales);
        sucursales = await sucursalesService.obtenerPorUsuario(usuario.id);
      } else {
        // Fallback: si no tiene asignadas, usar activas para garantizar selección
        console.log('🏢 [AUTH] Usuario sin sucursales asignadas, obteniendo sucursales activas');
        sucursales = await sucursalesService.obtenerActivas();
      }
      
      console.log('🏢 [AUTH] Sucursales obtenidas:', sucursales.length, sucursales);
      setSucursalesDisponibles(sucursales);
      
      // Seleccionar la primera sucursal por defecto o la guardada en localStorage
      const sucursalGuardada = localStorage.getItem('sucursalSeleccionada');
      console.log('🏢 [AUTH] Sucursal guardada en localStorage:', sucursalGuardada);
      
      if (sucursalGuardada) {
        const sucursal = sucursales.find(s => s.id === sucursalGuardada);
        if (sucursal) {
          console.log('🏢 [AUTH] Usando sucursal guardada:', sucursal);
          setSucursalSeleccionada(sucursal);
        } else if (sucursales.length > 0) {
          console.log('🏢 [AUTH] Sucursal guardada no encontrada, usando primera disponible:', sucursales[0]);
          setSucursalSeleccionada(sucursales[0]);
          localStorage.setItem('sucursalSeleccionada', sucursales[0].id);
        }
      } else if (sucursales.length > 0) {
        console.log('🏢 [AUTH] No hay sucursal guardada, usando primera disponible:', sucursales[0]);
        setSucursalSeleccionada(sucursales[0]);
        localStorage.setItem('sucursalSeleccionada', sucursales[0].id);
      } else {
        // Si aún no hay, crear una sucursal virtual temporal para evitar crashes
        console.log('🏢 [AUTH] No hay sucursales disponibles, creando fallback temporal');
        const fallback = { id: 'sucursal-principal', nombre: 'Sucursal Principal', tipo: 'principal' };
        setSucursalSeleccionada(fallback);
      }
      
      // DEBUG: Verificar el estado final
      console.log('🏢 [AUTH] Estado final después de selección:', {
        sucursalesDisponibles: sucursales.length,
        sucursalSeleccionada: sucursales.length > 0 ? sucursales[0] : 'ninguna'
      });
      
    } catch (error) {
      console.error('❌ [AUTH] Error al cargar sucursales del usuario:', error);
      toast.error('Error al cargar sucursales');
    } finally {
      setLoadingSucursales(false);
    }
  };

  /**
   * Cambiar sucursal seleccionada
   */
  const cambiarSucursal = (sucursalId) => {
    const sucursal = sucursalesDisponibles.find(s => s.id === sucursalId);
    if (sucursal) {
      setSucursalSeleccionada(sucursal);
      localStorage.setItem('sucursalSeleccionada', sucursalId);
      toast.success(`Cambiado a ${sucursal.nombre}`);
    }
  };

  const login = async (email, password) => {
    try {
      console.log("?? [AUTH] Iniciando login con:", email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Obtener token con custom claims
      const tokenResult = await firebaseUser.getIdTokenResult();
      const customClaims = tokenResult.claims;
      
      const user = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        nombre: customClaims.nombre || firebaseUser.displayName || 'Usuario',
        apellido: customClaims.apellido || '',
        rol: customClaims.rol || 'Usuario',
        rolId: customClaims.rolId || '1',
        permisos: customClaims.permisos || {},
        activo: customClaims.activo !== false,
        customClaims: customClaims,
        sucursales: customClaims.sucursales || []
      };
      
      setCurrentUser(user);
      setIsAuthenticated(true);
      
      // Calcular permisos efectivos
      await calcularPermisosEfectivos(user, user.customClaims?.orgId);
      
      // Cargar sucursales despues del login
      await cargarSucursalesUsuario(user);
      
      toast.success(`Bienvenido ${user.rol}: ${user.email}`);
      return user;
      
    } catch (error) {
      console.error("? [AUTH] ERROR EN LOGIN:", error);
      
      let message = 'Error al iniciar sesion';
      
      if (error.code === 'auth/user-not-found') {
        message = 'Usuario no encontrado';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Contrasena incorrecta';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Email invalido';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Demasiados intentos fallidos. Intenta mas tarde';
      } else if (error.message) {
        message = error.message;
      }
      
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setIsAuthenticated(false);
      setSucursalSeleccionada(null);
      setSucursalesDisponibles([]);
      setPermisosEfectivos({});
      localStorage.removeItem('sucursalSeleccionada');
      toast.info('Sesion cerrada correctamente');
    } catch (error) {
      console.error('? [AUTH] Error cerrando sesion:', error);
      toast.error('Error al cerrar sesion');
    }
  };

  const signUp = async (email, password) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = cred.user;
      
      // AUTOMÁTICO: Crear empresa automáticamente para el nuevo usuario
      try {
        console.log('🏢 [AUTH] Creando empresa automáticamente para nuevo usuario:', email);
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        const createTenant = httpsCallable(functions, 'createTenant');
        
        const result = await createTenant({
          nombre: email.split('@')[1].split('.')[0].toUpperCase() // Usar dominio del email
        });
        
        if (result.data.success) {
          console.log('✅ [AUTH] Empresa creada automáticamente:', result.data.orgId);
          // El orgId se establecerá automáticamente cuando se actualicen los custom claims
        }
      } catch (tenantError) {
        console.warn('⚠️ [AUTH] No se pudo crear empresa automáticamente:', tenantError.message);
        // No fallar el registro si no se puede crear la empresa
      }
      
      setCurrentUser({
        id: firebaseUser.uid,
        email: firebaseUser.email,
        nombre: firebaseUser.displayName || 'Usuario',
        rol: 'Usuario',
        rolId: '1',
        permisos: {},
        activo: true,
        sucursales: []
      });
      setIsAuthenticated(true);
      return firebaseUser;
    } catch (error) {
      throw error;
    }
  };

  // Funcion para obtener token de acceso
  const getAccessToken = async () => {
    if (auth.currentUser) {
      return await getIdToken(auth.currentUser);
    }
    return null;
  };

  /**
   * MEJORADO: Verificar permisos con mejor logica
   * @param {string} modulo - Modulo a verificar
   * @param {string} accion - Accion a verificar
   * @returns {boolean} Tiene permiso
   */
     const hasPermission = (modulo, accion) => {
     try {
       console.log(`🔐 [AUTH] Verificando permiso: ${modulo}.${accion}`);
       console.log(`🔐 [AUTH] Usuario actual:`, {
         id: currentUser?.id,
         email: currentUser?.email,
         rol: currentUser?.rol,
         rolId: currentUser?.rolId
       });
       
       // Administrador siempre tiene todos los permisos
       if (currentUser?.rol === 'Administrador' || 
           currentUser?.rol === 'admin' || 
           currentUser?.rol === 'Admin' ||
           currentUser?.rolId === 'admin') {
         console.log(`🔐 [AUTH] Usuario es administrador, permiso concedido: ${modulo}.${accion}`);
         return true;
       }
       
       // Verificar en permisos efectivos
       let tienePermiso = false;
       
       // Manejar permisos anidados (ej: stock.control.ver)
       if (accion.includes('.')) {
         const [submodulo, subaccion] = accion.split('.');
         tienePermiso = permisosEfectivos?.[modulo]?.[submodulo]?.[subaccion] || false;
       } else {
         tienePermiso = permisosEfectivos?.[modulo]?.[accion] || false;
       }
       
       console.log(`🔐 [AUTH] Permiso ${modulo}.${accion}: ${tienePermiso}`);
       console.log(`🔐 [AUTH] Permisos efectivos para ${modulo}:`, permisosEfectivos?.[modulo]);
       
       return tienePermiso;
       
     } catch (error) {
       console.error('❌ [AUTH] Error al verificar permisos:', error);
       return false;
     }
   };

  /**
   * NUEVO: Verificar si el usuario puede acceder a una sucursal especifica
   * @param {string} sucursalId - ID de la sucursal
   * @returns {boolean} Puede acceder
   */
  const canAccessSucursal = (sucursalId) => {
    try {
      // Administrador puede acceder a todas las sucursales
      if (currentUser?.rol === 'Administrador' || currentUser?.rol === 'admin' || currentUser?.rol === 'Admin') {
        return true;
      }
      
      // Verificar si la sucursal esta en la lista de sucursales disponibles
      return sucursalesDisponibles.some(s => s.id === sucursalId);
      
    } catch (error) {
      console.error('? [AUTH] Error al verificar acceso a sucursal:', error);
      return false;
    }
  };

  /**
   * NUEVO: Obtener informacion completa del usuario para debugging
   */
  const getUserInfo = () => {
    return {
      user: currentUser,
      permissions: permisosEfectivos,
      sucursales: sucursalesDisponibles,
      sucursalActual: sucursalSeleccionada
    };
  };

  const value = {
    currentUser,
    isAuthenticated,
    loading,
    login,
    signUp,
    logout,
    getAccessToken,
    hasPermission,
    sucursalSeleccionada,
    sucursalesDisponibles,
    loadingSucursales,
    cambiarSucursal,
    canAccessSucursal,
    permisosEfectivos,
    getUserInfo,
    orgId
  };

  // Exportar al objeto global para debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.hasPermission = hasPermission;
      window.authContext = value;
      window.debugAuth = () => {
        console.log('🔍 [AUTH DEBUG] Estado completo:', {
          currentUser,
          orgId,
          sucursalSeleccionada,
          sucursalesDisponibles,
          loadingSucursales,
          permisosEfectivos
        });
      };
      console.log('🔐 [AUTH] Funciones exportadas al objeto global para debugging');
      console.log('🔐 [AUTH] Usa window.debugAuth() para ver el estado completo');
    }
  }, [value]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}