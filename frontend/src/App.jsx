import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  PlusCircle,
  Play,
  Settings,
  History,
  LayoutDashboard,
  Globe,
  FolderOpen,
  Zap,
  CheckCircle2,
  Clock,
  Maximize2,
  Copy,
  Trash2,
  Code2,
  AlignLeft,
  MousePointer2,
  Keyboard,
  Hourglass,
  ArrowRight,
  Navigation,
  Link as LinkIcon,
  Globe2,
  Server,
  RotateCcw,
  Edit2,
  Check,
  FileDown,
  X,
  ChevronLeft,
  ChevronRight,
  FileEdit
} from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const API_BASE = 'http://localhost:3002/maquinadeteste';
const socket = io('http://localhost:3002', { path: '/maquinadeteste/socket.io' });

axios.interceptors.request.use(config => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});



export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tests, setTests] = useState([]);
  const [allowedUrls, setAllowedUrls] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState(null);

  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('adminToken'));
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [authForm, setAuthForm] = useState({ username: 'admin', password: '', newPassword: '' });

  const [instructionMode, setInstructionMode] = useState('text');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [stepBuilder, setStepBuilder] = useState({
    action: 'click',
    elementType: 'Button',
    name: '', id: '', text: '', value: '', description: '',
    method: 'GET'
  });
  const [formData, setFormData] = useState({ url: '', goal: '', context: '', engine: 'playwright' });
  const [newAllowed, setNewAllowed] = useState({ label: '', url: '' });
  const [loading, setLoading] = useState(false);
  const logEndRef = useRef(null);

  useEffect(() => {
    fetchHistory();
    fetchAllowedUrls();
    socket.on('test_update', (data) => {
      setTests(prev => prev.map(t => {
        if (t.id === data.testId) {
          const updatedLogs = [...(t.logs || []), data.log];
          const updatedScreenshots = data.log.screenshot ? [...(t.screenshots || []), data.log.screenshot] : (t.screenshots || []);
          return { ...t, status: data.status, logs: updatedLogs, screenshots: updatedScreenshots };
        }
        return t;
      }));
    });
    return () => socket.off('test_update');
  }, []);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTestId, tests]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const resp = await axios.get(`${API_BASE}/api/history`);
      setTests(resp.data || []);
    } catch (err) { console.error("Error fetching history", err); } finally { setHistoryLoading(false); }
  };

  const getUrlLabel = (url) => {
    const match = allowedUrls.find(u => u.url === url);
    return match ? match.label : url;
  };

  const fetchAllowedUrls = async () => {
    try {
      const resp = await axios.get(`${API_BASE}/api/allowed-urls`);
      const data = resp.data || [];
      setAllowedUrls(data);
      if (data.length > 0 && !formData.url) {
        setFormData(prev => ({ ...prev, url: data[0].url }));
      }
    } catch (err) { console.error("Error fetching allowed", err); }
  };

  const handleAddAllowedUrl = async (e) => {
    e.preventDefault();
    if (!newAllowed.url) return;
    try {
      await axios.post(`${API_BASE}/api/allowed-urls`, newAllowed);
      setNewAllowed({ label: '', url: '' });
      fetchAllowedUrls();
    } catch (err) { alert("Erro: " + err.message); }
  };

  const handleRemoveAllowedUrl = async (id) => {
    if (!confirm("Remover?")) return;
    try {
      await axios.delete(`${API_BASE}/api/allowed-urls/${id}`);
      fetchAllowedUrls();
    } catch (err) { alert("Erro: " + err.message); }
  };

  const checkHealth = async () => {
    setShowHealthModal(true);
    setHealthData(null);
    try {
      const res = await axios.get(`${API_BASE}/api/health`);
      setHealthData(res.data);
    } catch {
      setHealthData({ error: true });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, { username: authForm.username, password: authForm.password });
      localStorage.setItem('adminToken', res.data.token);
      setIsAuthenticated(true);
      if (res.data.needsPasswordChange) {
        setNeedsPasswordChange(true);
      } else {
        navigate('/config');
      }
    } catch (err) { alert('Erro no login: ' + (err.response?.data?.error || err.message)); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/api/auth/change-password`, {
        username: authForm.username,
        oldPassword: authForm.password,
        newPassword: authForm.newPassword
      });
      localStorage.setItem('adminToken', res.data.token);
      setNeedsPasswordChange(false);
      navigate('/config');
    } catch (err) { alert('Erro ao alterar senha: ' + (err.response?.data?.error || err.message)); }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    navigate('/');
  };

  const handleRemoveTest = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Deseja excluir este relatório?")) return;
    try {
      await axios.delete(`${API_BASE}/api/tests/${id}`);
      setTests(prev => prev.filter(t => t.id !== id));
      if (selectedTestId === id) setSelectedTestId(null);
    } catch (err) { alert("Erro ao excluir: " + err.message); }
  };

  const addStepToJson = () => {
    let currentSteps = [];
    try {
      const contextStr = formData.context || '[]';
      currentSteps = contextStr.trim().startsWith('[') ? JSON.parse(contextStr) : [];
    } catch (e) { currentSteps = []; }

    let newStep = {};
    if (stepBuilder.action === 'access') {
      const targetUrl = stepBuilder.value || formData.url;
      newStep = { url: targetUrl, description: stepBuilder.description || `Ir para ${targetUrl}` };
    } else if (stepBuilder.action === 'request') {
      newStep = {
        action: 'request',
        method: stepBuilder.method,
        url: stepBuilder.value,
        value: stepBuilder.text,
        description: stepBuilder.description || `API ${stepBuilder.method}: ${stepBuilder.value}`
      };
    } else {
      const selector = stepBuilder.id ? `#${stepBuilder.id}` : (stepBuilder.name ? `[name="${stepBuilder.name}"]` : (stepBuilder.text ? `text="${stepBuilder.text}"` : ''));
      newStep = { action: stepBuilder.action, selector, value: stepBuilder.value, description: stepBuilder.description || `${stepBuilder.action} em ${selector}` };
    }

    const updated = [...currentSteps, newStep];
    setFormData({ ...formData, context: JSON.stringify(updated, null, 2) });
    setStepBuilder({ action: 'click', elementType: 'Button', name: '', id: '', text: '', value: '', description: '', method: 'GET' });
  };

  const removeStep = (index) => {
    try {
      const steps = JSON.parse(formData.context || '[]');
      steps.splice(index, 1);
      setFormData({ ...formData, context: JSON.stringify(steps, null, 2) });
    } catch (e) { }
  };

  const updateStep = (index, newData) => {
    try {
      const steps = JSON.parse(formData.context || '[]');
      steps[index] = { ...steps[index], ...newData };
      setFormData({ ...formData, context: JSON.stringify(steps, null, 2) });
    } catch (e) { }
  };

  const stripEmojis = (text) => {
    if (!text) return '';
    return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  };

  const PLATFORM_LOGO = 'data:image/png;base64,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';

  const exportToPdf = async (test) => {
    if (!test) return;
    const doc = new jsPDF();
    const margin = 15;
    let y = 35; // Start below header

    // 1. Logo and Header
    try {
      doc.addImage(PLATFORM_LOGO, 'PNG', 165, 10, 30, 30);
    } catch (e) { }

    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text('Relatório de Execução', margin, 25);

    // Subtitle Line
    doc.setDrawColor(99, 102, 241); // Indigo
    doc.setLineWidth(1);
    doc.line(margin, 30, 150, 30);

    // 2. Summary Section
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`URL de Teste:`, margin, y);
    doc.setTextColor(30);
    doc.text(`${test.url}`, margin + 30, y);
    y += 8;

    doc.setTextColor(100);
    doc.text(`Motor Utilizado:`, margin, y);
    doc.setTextColor(30);
    doc.text(`${test.engine.toUpperCase()}`, margin + 30, y);
    y += 8;

    doc.setTextColor(100);
    doc.text(`Status Final:`, margin, y);
    doc.setTextColor(test.status === 'completed' ? '#10b981' : '#ef4444');
    doc.text(`${test.status.toUpperCase()}`, margin + 30, y);
    y += 15;

    // 3. Execution Logs
    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text('Logs de Execução:', margin, y);
    y += 10;

    doc.setFontSize(9);
    doc.setTextColor(60);

    (test.logs || []).forEach(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const typeLabel = log.type === 'error' ? '[ERRO]' : (log.type === 'warning' ? '[AVISO]' : '[INFO]');
      const text = stripEmojis(`${time} ${typeLabel}: ${log.message}`);
      const splitText = doc.splitTextToSize(text, 180);

      if (y + (splitText.length * 5) > 270) {
        doc.addPage();
        y = 30;
      }

      doc.text(splitText, margin, y);
      y += (splitText.length * 5) + 2;
    });

    // 4. Screenshots Section
    if (test.screenshots && test.screenshots.length > 0) {
      doc.addPage();
      y = 30;
      doc.setFontSize(14);
      doc.setTextColor(30);
      doc.text('Evidências de Teste (Screenshots):', margin, y);
      y += 15;

      for (const s of test.screenshots) {
        try {
          const imgUrl = (s && typeof s === 'string' && s.startsWith('data:')) ? s : (s && s.startsWith('/')) ? (API_BASE.replace('/maquinadeteste', '') + s) : `data:image/png;base64,${s}`;

          const img = new Image();
          img.crossOrigin = "Anonymous";
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            img.src = imgUrl;
          });

          if (img.complete && img.naturalWidth > 0) {
            const imgWidth = 180;
            const imgHeight = (img.naturalHeight * imgWidth) / img.naturalWidth;

            if (y + imgHeight > 270) {
              doc.addPage();
              y = 30;
            }
            doc.addImage(img, 'PNG', margin, y, imgWidth, imgHeight);
            y += imgHeight + 15;
          }
        } catch (err) { }
      }
    }

    // 5. Footer and Metadata (Applied to all pages)
    const pageCount = doc.internal.getNumberOfPages();
    const generationDate = new Date().toLocaleString('pt-BR');

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(230);
      doc.line(margin, 282, 195, 282); // Footer divider

      doc.setFontSize(8);
      doc.setTextColor(150);

      // Left: Date
      doc.text(`Gerado em: ${generationDate}`, margin, 288);

      // Center: Platform Branding
      doc.text('Documento oficial criado via Maquina de Testes MCP', 105, 288, { align: 'center' });

      // Right: Pagination
      doc.text(`Página ${i} de ${pageCount}`, 195, 288, { align: 'right' });
    }

    doc.save(`relatorio_teste_${test.id}.pdf`);
  };

  const handleEditFlow = (test) => {
    console.log("Iniciando edição do fluxo para o teste:", test.id);
    if (!test) return;

    let contextStr = test.context;
    if (typeof test.context !== 'string') {
      contextStr = JSON.stringify(test.context, null, 2);
    }

    setFormData({
      url: test.url || '',
      goal: test.goal || '',
      engine: test.engine || 'playwright',
      context: contextStr || ''
    });

    if (contextStr && contextStr.trim().startsWith('[')) {
      setInstructionMode('builder');
    } else {
      setInstructionMode('text');
    }

    console.log("Limpando selectedTestId e navegando para /");
    setSelectedTestId(null);
    navigate('/');
  };

  const triggerTestRun = async (data) => {
    setLoading(true);
    try {
      const resp = await axios.post(`${API_BASE}/api/tests/run`, data);
      const newTest = { id: resp.data.testId, ...data, status: 'starting', logs: [], screenshots: [], startTime: new Date() };
      setTests(prev => [newTest, ...prev]);
      navigate('/');
      setSelectedTestId(resp.data.testId);
    } catch (err) { alert("Erro: " + err.message); } finally { setLoading(false); }
  };

  const startTest = async (e) => {
    if (e) e.preventDefault();
    await triggerTestRun(formData);
  };

  const handleReprocess = (test) => {
    const data = {
      url: test.url,
      goal: test.goal,
      context: test.context,
      engine: test.engine
    };
    triggerTestRun(data);
  };

  const selectedTest = tests.find(t => t.id === selectedTestId);

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header" onClick={() => { navigate('/'); setSelectedTestId(null); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={24} color="#6366f1" style={{ flexShrink: 0 }} />
          <h1 style={{ fontSize: '20px', lineHeight: '1.2' }}>Máquina de Testes</h1>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${location.pathname === '/' ? 'active' : ''}`} onClick={() => { navigate('/'); setSelectedTestId(null); }}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button className={`nav-item ${location.pathname === '/config' ? 'active' : ''}`} onClick={() => navigate('/config')}>
            <Settings size={18} /> Configurações Admin
          </button>
          <button className="nav-item" onClick={checkHealth}>
            <Server size={18} /> Saúde do Sistema
          </button>
        </nav>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <History size={16} /> <span>Histórico</span>
          </div>
          {historyLoading ? (
            <div style={{ fontSize: '12px', opacity: 0.6, padding: '8px', textAlign: 'center' }}>Carregando histórico...</div>
          ) : tests.length === 0 ? (
            <div style={{ fontSize: '12px', opacity: 0.6, padding: '8px', textAlign: 'center' }}>Nenhum teste encontrado.</div>
          ) : tests.map(test => (
            <div key={test.id} className={`test-item ${test.id === selectedTestId ? 'active' : ''}`} onClick={() => { setSelectedTestId(test.id); navigate('/'); }}>
              <div style={{ maxWidth: '140px', overflow: 'hidden' }}>
                <p style={{ fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontWeight: 'bold', margin: 0 }}>{getUrlLabel(test.url)}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.6 }}>
                  <small>{new Date(test.startTime).toLocaleTimeString()}</small>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase', background: 'rgba(99, 102, 241, 0.1)', padding: '1px 4px', borderRadius: '3px' }}>{test.engine}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <span className={`status-badge ${test.status || 'idle'}`}>{test.status || '...'}</span>
                <button onClick={(e) => handleRemoveTest(e, test.id)} style={{ padding: '4px', background: 'transparent', border: 'none', color: 'rgba(239, 68, 68, 0.5)' }} className="delete-btn-hover">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="main-content">
        {showHealthModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: '400px', position: 'relative' }}>
              <button onClick={() => setShowHealthModal(false)} style={{ position: 'absolute', top: 10, right: 10, background: 'transparent', border: 'none', cursor: 'pointer' }}>X</button>
              <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Server size={20} /> Status do Ambiente</h2>
              {!healthData ? <p>Analisando...</p> : healthData.error ? <p>Erro ao conectar no servidor (Backend Offline).</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Servidor API (Node):</span><span style={{ fontWeight: 'bold', color: '#10b981' }}>Online</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Supabase (Banco):</span><span style={{ fontWeight: 'bold', color: healthData.database === 'online' ? '#10b981' : '#ef4444' }}>{healthData.database}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Motor Playwright:</span><span style={{ fontWeight: 'bold', color: healthData.playwright === 'online' ? '#10b981' : '#ef4444' }}>{healthData.playwright}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Motor Selenium:</span><span style={{ fontWeight: 'bold', color: healthData.selenium === 'online' ? '#10b981' : '#ef4444' }}>{healthData.selenium}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Motor Cypress:</span><span style={{ fontWeight: 'bold', color: healthData.cypress === 'online' ? '#10b981' : '#ef4444' }}>{healthData.cypress}</span></div>
                </div>
              )}
            </div>
          </div>
        )}

        <Routes>
          <Route path="/login" element={
            <div className="card" style={{ maxWidth: '400px', margin: '40px auto' }}>
              <h2>{needsPasswordChange ? 'Troca de Senha Obrigatória' : 'Acesso Restrito API'}</h2>
              <p style={{ opacity: 0.6, fontSize: '13px', marginBottom: '24px' }}>
                {needsPasswordChange ? 'Para sua segurança, defina uma nova senha para a gerência de testes antes de continuar.' : 'Faça login como administrador para configurar permissões de URLs.'}
              </p>
              <form onSubmit={needsPasswordChange ? handlePasswordChange : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="input-group">
                  <label>Usuário</label>
                  <input value={authForm.username} disabled style={{ opacity: 0.5 }} />
                </div>
                <div className="input-group">
                  <label>{needsPasswordChange ? 'Senha Atual' : 'Senha'}</label>
                  <input type="password" required value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} autoFocus />
                </div>
                {needsPasswordChange && (
                  <div className="input-group">
                    <label>Nova Senha</label>
                    <input type="password" required minLength={6} value={authForm.newPassword} onChange={e => setAuthForm({ ...authForm, newPassword: e.target.value })} />
                  </div>
                )}
                <button type="submit" style={{ padding: '12px' }}>{needsPasswordChange ? 'Atualizar e Entrar' : 'Entrar no Painel'}</button>
              </form>
            </div>
          } />

          <Route path="/config" element={
            !isAuthenticated ? <Navigate to="/login" replace /> : (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Settings size={24} />
                    <h2>Configurações Autorizadas</h2>
                  </div>
                  <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid var(--border)' }}>Sair</button>
                </div>
                <form onSubmit={handleAddAllowedUrl} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '12px', marginBottom: '24px' }}>
                  <div className="input-group"><label>Label</label><input value={newAllowed.label} onChange={e => setNewAllowed({ ...newAllowed, label: e.target.value })} /></div>
                  <div className="input-group"><label>URL</label><input value={newAllowed.url} onChange={e => setNewAllowed({ ...newAllowed, url: e.target.value })} required /></div>
                  <button type="submit" style={{ alignSelf: 'end', height: '42px' }}>Salvar</button>
                </form>
                <table style={{ width: '100%' }}>
                  <thead><tr style={{ textAlign: 'left' }}><th>Label</th><th>URL</th><th style={{ textAlign: 'right' }}>Ação</th></tr></thead>
                  <tbody>
                    {allowedUrls.map(u => (
                      <tr key={u.id}><td>{u.label}</td><td style={{ color: '#6366f1' }}>{u.url}</td><td style={{ textAlign: 'right' }}><button onClick={() => handleRemoveAllowedUrl(u.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><Trash2 size={16} /></button></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          } />

          <Route path="/" element={
            selectedTestId && !selectedTest ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>Carregando dados do teste...</div>
            ) : selectedTestId ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: selectedTest?.status === 'completed' ? 'var(--success)' : (selectedTest?.status === 'failed' ? 'var(--danger)' : 'var(--primary)'), width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selectedTest?.status === 'completed' ? <CheckCircle2 color="white" /> : <Clock color="white" />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0 }}>Relatório de Execução</h3>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', background: 'rgba(99, 102, 241, 0.2)', color: '#6366f1', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                          {selectedTest?.engine}
                        </span>
                      </div>
                      <p style={{ opacity: 0.6, margin: 0 }}>{selectedTest?.url}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(selectedTest?.status === 'failed' || selectedTest?.status === 'completed') && (
                      <>
                        <button onClick={() => exportToPdf(selectedTest)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                          <FileDown size={16} /> Exportar PDF
                        </button>
                        <button onClick={() => handleEditFlow(selectedTest)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                          <FileEdit size={16} /> Editar Fluxo
                        </button>
                        <button onClick={() => handleReprocess(selectedTest)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--primary)', color: 'white' }}>
                          <RotateCcw size={16} /> Reprocessar
                        </button>
                      </>
                    )}
                    {(selectedTest?.status === 'starting') && (
                      <button onClick={() => handleEditFlow(selectedTest)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                        <FileEdit size={16} /> Editar Fluxo
                      </button>
                    )}
                    <button onClick={() => { setSelectedTestId(null); navigate('/'); }} style={{ background: 'transparent', border: '1px solid var(--border)' }}><ArrowRight size={16} /> Voltar</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ marginBottom: '12px', fontSize: '11px', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Logs</h4>
                    <div className="card">
                      <div className="log-viewer">
                        {(selectedTest?.logs || []).map((L, i) => (
                          <div key={i} className="log-entry"><span style={{ opacity: 0.4 }}>[{new Date(L.timestamp).toLocaleTimeString()}]</span> <span className={L.type}>{L.message}</span></div>
                        ))}
                        <div ref={logEndRef} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ marginBottom: '12px', fontSize: '11px', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Screenshots</h4>
                    <div className="card">
                      <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' }}>
                        {(selectedTest?.screenshots || []).map((s, i) => (
                          <div key={i} className="screenshot-card" style={{ marginBottom: '16px', cursor: 'pointer' }} onClick={() => setSelectedImageIndex(i)}>
                            <img src={(s && typeof s === 'string' && s.startsWith('data:')) ? s : (s && s.startsWith('/')) ? (API_BASE.replace('/maquinadeteste', '') + s) : `data:image/png;base64,${s}`} style={{ width: '100%', borderRadius: '8px' }} />
                            <div style={{ padding: '8px', fontSize: '11px', opacity: 0.7 }}>Captura {i + 1}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <Play size={24} />
                  <h2>Iniciar fluxo de teste</h2>
                </div>
                <form onSubmit={startTest}>
                  <div className="input-group">
                    <label>URL / Domínio Base</label>
                    <select value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })} required>
                      <option value="">Selecione...</option>
                      {allowedUrls.map(u => <option key={u.id} value={u.url}>{u.label || u.url}</option>)}
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Motor de Teste</label>
                    <select value={formData.engine} onChange={e => setFormData({ ...formData, engine: e.target.value })} required>
                      <option value="playwright">Playwright</option>
                      <option value="selenium">Selenium WebDriver</option>
                      <option value="cypress">Cypress</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label>Passos da Automação</label>
                      <div className="toggle-container" style={{ display: 'flex', gap: '4px', background: 'var(--border)', padding: '2px', borderRadius: '6px' }}>
                        <button type="button" className={instructionMode === 'text' ? 'active' : ''} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: 'none', background: instructionMode === 'text' ? 'var(--primary)' : 'transparent', color: 'white' }} onClick={() => setInstructionMode('text')}>Texto</button>
                        <button type="button" className={instructionMode === 'builder' ? 'active' : ''} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: 'none', background: instructionMode === 'builder' ? 'var(--primary)' : 'transparent', color: 'white' }} onClick={() => { setInstructionMode('builder'); if (!formData.context.startsWith('[')) setFormData({ ...formData, context: '[]' }); }}>Filtros</button>
                      </div>
                    </div>

                    {instructionMode === 'text' ? (
                      <textarea rows="4" value={formData.context} onChange={e => setFormData({ ...formData, context: e.target.value })} placeholder="Clique em login; Digite usuário..." />
                    ) : (
                      <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '10px' }}>Ação</label>
                            <select value={stepBuilder.action} onChange={e => setStepBuilder({ ...stepBuilder, action: e.target.value })}>
                              <option value="click">Clique (DOM)</option>
                              <option value="type">Digite (Fill)</option>
                              <option value="access">Acessar (URL)</option>
                              <option value="request">API Request (Fetch)</option>
                              <option value="wait">Aguarde (ms)</option>
                            </select>
                          </div>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            {stepBuilder.action === 'request' ? (
                              <>
                                <label style={{ fontSize: '10px' }}>Verbo HTTP</label>
                                <select value={stepBuilder.method} onChange={e => setStepBuilder({ ...stepBuilder, method: e.target.value })}>
                                  <option value="GET">GET</option><option value="POST">POST</option><option value="PUT">PUT</option><option value="DELETE">DELETE</option>
                                </select>
                              </>
                            ) : (
                              <>
                                <label style={{ fontSize: '10px' }}>Tipo Elemento</label>
                                <select value={stepBuilder.elementType} onChange={e => setStepBuilder({ ...stepBuilder, elementType: e.target.value })} disabled={stepBuilder.action === 'wait' || stepBuilder.action === 'access'}>
                                  <option value="Button">Botão</option><option value="Input Text">Texto</option><option value="Input Password">Senha</option>
                                </select>
                              </>
                            )}
                          </div>
                        </div>

                        {stepBuilder.action !== 'request' && stepBuilder.action !== 'wait' && stepBuilder.action !== 'access' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <input placeholder="ID" value={stepBuilder.id} onChange={e => setStepBuilder({ ...stepBuilder, id: e.target.value })} />
                            <input placeholder="Name" value={stepBuilder.name} onChange={e => setStepBuilder({ ...stepBuilder, name: e.target.value })} />
                            <input placeholder="Texto" value={stepBuilder.text} onChange={e => setStepBuilder({ ...stepBuilder, text: e.target.value })} />
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end' }}>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '10px' }}>
                              {stepBuilder.action === 'request' ? 'Endpoint (Ex: /api/v1/user)' :
                                stepBuilder.action === 'wait' ? 'Tempo (ms)' : 'Valor / URL'}
                            </label>
                            <input placeholder="Valor..." value={stepBuilder.value} onChange={e => setStepBuilder({ ...stepBuilder, value: e.target.value })} />
                          </div>
                          <button type="button" onClick={addStepToJson} style={{ padding: '12px' }}><PlusCircle size={18} /> Adicionar Passo</button>
                        </div>

                        {stepBuilder.action === 'request' && (
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '10px' }}>JSON Body / Payload (opcional)</label>
                            <textarea rows="2" placeholder='{"key": "value"}' value={stepBuilder.text} onChange={e => setStepBuilder({ ...stepBuilder, text: e.target.value })} />
                          </div>
                        )}

                        <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                          <p style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>Lista de Passos:</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
                            {(() => {
                              try {
                                const steps = JSON.parse(formData.context || '[]');
                                if (!Array.isArray(steps)) return null;
                                return steps.map((s, idx) => (
                                  <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    {editingStepIndex === idx ? (
                                      <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                                        <input style={{ fontSize: '12px', flex: 1 }} value={s.description} onChange={(e) => updateStep(idx, { description: e.target.value })} />
                                        <input style={{ fontSize: '12px', width: '100px' }} value={s.value} onChange={(e) => updateStep(idx, { value: e.target.value })} />
                                        <button type="button" onClick={() => setEditingStepIndex(null)} style={{ background: 'var(--success)', border: 'none', padding: '4px 8px', borderRadius: '4px' }}><Check size={14} /></button>
                                      </div>
                                    ) : (
                                      <>
                                        <div style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          <strong style={{ textTransform: 'uppercase', color: 'var(--primary)', fontSize: '10px' }}>{s.action || (s.url ? 'ACCESS' : 'STEP')}:</strong> {s.description}
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                          <button type="button" onClick={() => setEditingStepIndex(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '4px' }}><Edit2 size={14} /></button>
                                          <button type="button" onClick={() => removeStep(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', opacity: 0.7, padding: '4px' }}><Trash2 size={14} /></button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ));
                              } catch (e) { return null; }
                            })()}
                          </div>
                        </div>

                        <textarea rows="3" style={{ fontSize: '12px', background: '#020617', border: '1px solid var(--border)', opacity: 0.5 }} value={formData.context} readOnly />
                      </div>
                    )}
                  </div>
                  <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', marginTop: '12px' }}>{loading ? 'Inicializando...' : 'Iniciar fluxo de teste'}</button>
                </form>
              </div>
            )
          } />
        </Routes>
      </main>
      {selectedImageIndex !== null && selectedTest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '40px' }}>
          <button style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', padding: '8px', cursor: 'pointer' }} onClick={() => setSelectedImageIndex(null)}><X size={32} /></button>

          <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', color: 'white', background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '20px', fontSize: '14px' }}>
            {selectedImageIndex + 1} de {selectedTest.screenshots.length}
          </div>

          <button
            style={{ position: 'absolute', left: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', padding: '12px', cursor: 'pointer', visibility: selectedImageIndex > 0 ? 'visible' : 'hidden' }}
            onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(prev => prev - 1); }}
          >
            <ChevronLeft size={48} />
          </button>

          <img
            src={(() => {
              const s = selectedTest.screenshots[selectedImageIndex];
              return (s && typeof s === 'string' && s.startsWith('data:')) ? s : (s && s.startsWith('/')) ? (API_BASE.replace('/maquinadeteste', '') + s) : `data:image/png;base64,${s}`;
            })()}
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}
            onClick={(e) => e.stopPropagation()}
          />

          <button
            style={{ position: 'absolute', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', padding: '12px', cursor: 'pointer', visibility: selectedImageIndex < selectedTest.screenshots.length - 1 ? 'visible' : 'hidden' }}
            onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(prev => prev + 1); }}
          >
            <ChevronRight size={48} />
          </button>
        </div>
      )}
    </div>
  );
}
