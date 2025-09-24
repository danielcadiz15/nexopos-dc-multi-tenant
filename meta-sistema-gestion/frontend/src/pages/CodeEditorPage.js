import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  Breadcrumbs,
  Link,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Code,
  FolderOpen,
  InsertDriveFile,
  Save,
  Search,
  Refresh,
  MoreVert,
  SmartToy
} from '@mui/icons-material';
import MonacoEditor from '@monaco-editor/react';
import { useSystem } from '../contexts/SystemContext';
import { useAI } from '../contexts/AIContext';
import { toast } from 'react-toastify';

export default function CodeEditorPage() {
  const { systemId } = useParams();
  const { systems, currentSystem, selectSystem, getFiles, getFileContent, saveFile } = useSystem();
  const { sendMessage } = useAI();
  
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    if (systemId && systems.length > 0) {
      const system = systems.find(s => s.id === systemId);
      if (system) {
        selectSystem(system);
        loadFiles('');
      }
    }
  }, [systemId, systems]);

  const loadFiles = async (path = '') => {
    if (!currentSystem) return;
    
    setLoading(true);
    try {
      const fileList = await getFiles(currentSystem.id, path);
      setFiles(fileList || []);
      setCurrentPath(path);
      
      // Actualizar breadcrumb
      const pathParts = path.split('/').filter(p => p);
      setBreadcrumb([
        { name: currentSystem.name, path: '' },
        ...pathParts.map((part, index) => ({
          name: part,
          path: pathParts.slice(0, index + 1).join('/')
        }))
      ]);
    } catch (error) {
      toast.error('Error cargando archivos');
    } finally {
      setLoading(false);
    }
  };

  const openFile = async (fileName) => {
    if (!currentSystem) return;
    
    setLoading(true);
    try {
      const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
      const fileData = await getFileContent(currentSystem.id, filePath);
      
      if (fileData) {
        setCurrentFile({
          name: fileName,
          path: filePath,
          size: fileData.size,
          modified: fileData.modified
        });
        setFileContent(fileData.content);
      }
    } catch (error) {
      toast.error('Error abriendo archivo');
    } finally {
      setLoading(false);
    }
  };

  const openDirectory = (dirName) => {
    const newPath = currentPath ? `${currentPath}/${dirName}` : dirName;
    loadFiles(newPath);
  };

  const navigateToPath = (path) => {
    loadFiles(path);
  };

  const handleSave = async () => {
    if (!currentFile || !currentSystem) return;
    
    setLoading(true);
    try {
      const success = await saveFile(currentSystem.id, currentFile.path, fileContent);
      if (success) {
        toast.success('Archivo guardado exitosamente');
      }
    } catch (error) {
      toast.error('Error guardando archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleEditorChange = (value) => {
    setFileContent(value || '');
  };

  const getFileIcon = (file) => {
    return file.type === 'directory' ? <FolderOpen /> : <InsertDriveFile />;
  };

  const getFileLanguage = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'json': 'json',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'md': 'markdown',
      'py': 'python',
      'php': 'php',
      'xml': 'xml',
      'yml': 'yaml',
      'yaml': 'yaml'
    };
    return languageMap[ext] || 'plaintext';
  };

  const askAIAboutCode = () => {
    if (currentFile && fileContent) {
      const query = `Analiza este código del archivo ${currentFile.name} del sistema ${currentSystem.name}:\n\n${fileContent.substring(0, 500)}...`;
      sendMessage(query);
    }
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  if (!currentSystem) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Alert severity="info">
          Selecciona un sistema para editar código
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            <Code sx={{ mr: 1, verticalAlign: 'middle' }} />
            Editor de Código
          </Typography>
          <Chip 
            label={`Sistema: ${currentSystem.name}`} 
            color="primary" 
            variant="outlined" 
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => loadFiles(currentPath)}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={!currentFile || loading}
          >
            Guardar
          </Button>
          <IconButton onClick={handleMenuClick}>
            <MoreVert />
          </IconButton>
        </Box>
      </Box>

      {/* Breadcrumb */}
      <Box sx={{ mb: 2 }}>
        <Breadcrumbs>
          {breadcrumb.map((item, index) => (
            <Link
              key={index}
              component="button"
              variant="body2"
              onClick={() => navigateToPath(item.path)}
              sx={{ cursor: 'pointer', textDecoration: 'none' }}
            >
              {item.name}
            </Link>
          ))}
        </Breadcrumbs>
      </Box>

      <Grid container spacing={2} sx={{ height: 'calc(100vh - 200px)' }}>
        {/* Explorer de archivos */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ height: '100%', overflow: 'auto' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">
                Explorador de Archivos
              </Typography>
            </Box>
            <Box sx={{ p: 1 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                files.map((file, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 1,
                      cursor: 'pointer',
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                    onClick={() => {
                      if (file.type === 'directory') {
                        openDirectory(file.name);
                      } else {
                        openFile(file.name);
                      }
                    }}
                  >
                    {getFileIcon(file)}
                    <Box sx={{ ml: 1, flexGrow: 1 }}>
                      <Typography variant="body2">
                        {file.name}
                      </Typography>
                      {file.type === 'file' && (
                        <Typography variant="caption" color="text.secondary">
                          {Math.round(file.size / 1024)}KB
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Editor de código */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  {currentFile ? currentFile.name : 'Selecciona un archivo'}
                </Typography>
                {currentFile && (
                  <Tooltip title="Pregúntale a la AI sobre este código">
                    <IconButton onClick={askAIAboutCode} color="primary">
                      <SmartToy />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {currentFile && (
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip size="small" label={`Tamaño: ${Math.round(currentFile.size / 1024)}KB`} />
                  <Chip size="small" label={getFileLanguage(currentFile.name)} />
                </Box>
              )}
            </Box>
            
            <Box sx={{ flexGrow: 1 }}>
              {currentFile ? (
                <MonacoEditor
                  height="100%"
                  language={getFileLanguage(currentFile.name)}
                  value={fileContent}
                  onChange={handleEditorChange}
                  options={{
                    selectOnLineNumbers: true,
                    minimap: { enabled: true },
                    fontSize: 14,
                    wordWrap: 'on',
                    automaticLayout: true,
                    scrollBeyondLastLine: false
                  }}
                  theme="vs-light"
                />
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100%',
                  color: 'text.secondary'
                }}>
                  <Code sx={{ fontSize: 64, mb: 2 }} />
                  <Typography variant="h6">
                    Selecciona un archivo para empezar a editar
                  </Typography>
                  <Typography variant="body2">
                    Navega por el explorador de archivos y haz clic en cualquier archivo
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Menú contextual */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { askAIAboutCode(); handleMenuClose(); }}>
          <SmartToy sx={{ mr: 1 }} />
          Analizar con AI
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Search sx={{ mr: 1 }} />
          Buscar en archivos
        </MenuItem>
      </Menu>
    </Box>
  );
}