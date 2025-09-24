const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs-extra');
const path = require('path');

// Ruta del archivo de usuarios (en un sistema real usarías una base de datos)
const usersFilePath = path.join(__dirname, '../config/users.json');

// Middleware para verificar token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token de acceso requerido'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'meta-sistema-secret', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Token inválido'
      });
    }
    req.user = user;
    next();
  });
};

// POST /api/auth/login - Iniciar sesión
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Usuario y contraseña requeridos'
      });
    }

    // Cargar usuarios
    const users = await loadUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Generar token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'meta-sistema-secret',
      { expiresIn: '24h' }
    );

    // Actualizar último acceso
    user.lastLogin = new Date().toISOString();
    await saveUsers(users);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error en el servidor',
      details: error.message
    });
  }
});

// POST /api/auth/register - Registrar usuario (solo admin)
router.post('/register', authenticateToken, async (req, res) => {
  try {
    // Verificar que el usuario actual es admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores pueden registrar usuarios'
      });
    }

    const { username, password, email, name, role = 'user' } = req.body;
    
    if (!username || !password || !email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son requeridos'
      });
    }

    // Cargar usuarios existentes
    const users = await loadUsers();
    
    // Verificar que no existe el usuario
    if (users.find(u => u.username === username)) {
      return res.status(409).json({
        success: false,
        error: 'El usuario ya existe'
      });
    }

    if (users.find(u => u.email === email)) {
      return res.status(409).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear nuevo usuario
    const newUser = {
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
      createdBy: req.user.username,
      active: true
    };

    users.push(newUser);
    await saveUsers(users);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error registrando usuario',
      details: error.message
    });
  }
});

// GET /api/auth/profile - Obtener perfil del usuario
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const users = await loadUsers();
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo perfil',
      details: error.message
    });
  }
});

// PUT /api/auth/profile - Actualizar perfil
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    
    const users = await loadUsers();
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const user = users[userIndex];

    // Si se proporciona nueva contraseña, verificar la actual
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          error: 'Contraseña actual requerida'
        });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          error: 'Contraseña actual incorrecta'
        });
      }

      user.password = await bcrypt.hash(newPassword, 10);
    }

    // Actualizar otros campos
    if (name) user.name = name;
    if (email) {
      // Verificar que el email no esté en uso por otro usuario
      const emailExists = users.find(u => u.email === email && u.id !== req.user.id);
      if (emailExists) {
        return res.status(409).json({
          success: false,
          error: 'El email ya está en uso'
        });
      }
      user.email = email;
    }

    user.updatedAt = new Date().toISOString();
    users[userIndex] = user;
    
    await saveUsers(users);

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error actualizando perfil',
      details: error.message
    });
  }
});

// GET /api/auth/users - Listar usuarios (solo admin)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores pueden ver usuarios'
      });
    }

    const users = await loadUsers();
    const userList = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    }));

    res.json({
      success: true,
      users: userList,
      total: userList.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo usuarios',
      details: error.message
    });
  }
});

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', authenticateToken, (req, res) => {
  // En un sistema real, podrías invalidar el token en una blacklist
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
});

// Funciones auxiliares
async function loadUsers() {
  try {
    await fs.ensureFile(usersFilePath);
    const data = await fs.readFile(usersFilePath, 'utf-8');
    
    if (!data.trim()) {
      // Crear usuario admin por defecto
      const defaultUsers = [{
        id: '1',
        username: 'admin',
        password: await bcrypt.hash('admin123', 10),
        email: 'admin@metasistema.com',
        name: 'Administrador',
        role: 'admin',
        createdAt: new Date().toISOString(),
        active: true
      }];
      
      await saveUsers(defaultUsers);
      return defaultUsers;
    }
    
    return JSON.parse(data);
  } catch (error) {
    console.error('Error cargando usuarios:', error);
    return [];
  }
}

async function saveUsers(users) {
  try {
    await fs.ensureDir(path.dirname(usersFilePath));
    await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error guardando usuarios:', error);
    throw error;
  }
}

module.exports = { router, authenticateToken };