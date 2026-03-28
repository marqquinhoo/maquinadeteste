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
  Server
} from 'lucide-react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8084/maquinadeteste';
const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:8084', {
  path: import.meta.env.VITE_SOCKET_PATH || '/maquinadeteste/socket.io'
});

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tests, setTests] = useState([]);
  const [allowedUrls, setAllowedUrls] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState(null);

  const [instructionMode, setInstructionMode] = useState('text');
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
    try {
      const resp = await axios.get(`${API_BASE}/api/history`);
      setTests(resp.data || []);
    } catch (err) { console.error("Error fetching history", err); }
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

    setFormData({ ...formData, context: JSON.stringify([...currentSteps, newStep], null, 2) });
    setStepBuilder({ action: 'click', elementType: 'Button', name: '', id: '', text: '', value: '', description: '', method: 'GET' });
  };

  const startTest = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const resp = await axios.post(`${API_BASE}/api/tests/run`, formData);
      const newTest = { id: resp.data.testId, ...formData, status: 'starting', logs: [], screenshots: [], startTime: new Date() };
      setTests(prev => [newTest, ...prev]);
      navigate('/');
      setSelectedTestId(resp.data.testId);
    } catch (err) { alert("Erro: " + err.message); } finally { setLoading(false); }
  };

  const selectedTest = tests.find(t => t.id === selectedTestId);

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header" onClick={() => { navigate('/'); setSelectedTestId(null); }} style={{ cursor: 'pointer' }}>
          <Zap size={24} color="#6366f1" />
          <h1 style={{ fontSize: '20px' }}>AutoTesteAI</h1>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-item ${location.pathname === '/' ? 'active' : ''}`} onClick={() => { navigate('/'); setSelectedTestId(null); }}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
        </nav>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <History size={16} /> <span>Histórico</span>
          </div>
          {tests.map(test => (
            <div key={test.id} className={`test-item ${test.id === selectedTestId ? 'active' : ''}`} onClick={() => { setSelectedTestId(test.id); navigate('/'); }}>
              <div style={{ maxWidth: '140px', overflow: 'hidden' }}>
                <p style={{ fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', fontWeight: 'bold' }}>{test.url}</p>
                <small style={{ opacity: 0.6 }}>{new Date(test.startTime).toLocaleTimeString()}</small>
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
        <Routes>
          <Route path="/config" element={
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <Settings size={24} />
                <h2>Configurações</h2>
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
                    <div><h3>Relatório de Execução</h3><p style={{ opacity: 0.6 }}>{selectedTest?.url}</p></div>
                  </div>
                  <button onClick={() => { setSelectedTestId(null); navigate('/'); }} style={{ background: 'transparent', border: '1px solid var(--border)' }}><ArrowRight size={16} /> Voltar</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
                  <div className="card">
                    <div className="log-viewer">
                      {(selectedTest?.logs || []).map((L, i) => (
                        <div key={i} className="log-entry"><span style={{ opacity: 0.4 }}>[{new Date(L.timestamp).toLocaleTimeString()}]</span> <span className={L.type}>{L.message}</span></div>
                      ))}
                      <div ref={logEndRef} />
                    </div>
                  </div>
                  <div className="card">
                    <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' }}>
                      {(selectedTest?.screenshots || []).map((s, i) => (
                        <div key={i} className="screenshot-card" style={{ marginBottom: '16px' }}>
                          <img src={(s && typeof s === 'string' && s.startsWith('data:')) ? s : (s && s.startsWith('/')) ? (API_BASE.replace('/maquinadeteste', '') + s) : `data:image/png;base64,${s}`} style={{ width: '100%', borderRadius: '8px' }} />
                          <div style={{ padding: '8px', fontSize: '11px', opacity: 0.7 }}>Captura {i + 1}</div>
                        </div>
                      ))}
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
                          <button type="button" onClick={addStepToJson} style={{ background: 'var(--success)', padding: '0 12px', height: '42px' }}><PlusCircle size={18} /></button>
                        </div>

                        {stepBuilder.action === 'request' && (
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '10px' }}>JSON Body / Payload (opcional)</label>
                            <textarea rows="2" placeholder='{"key": "value"}' value={stepBuilder.text} onChange={e => setStepBuilder({ ...stepBuilder, text: e.target.value })} />
                          </div>
                        )}

                        <textarea rows="3" style={{ fontSize: '12px', background: '#020617', border: '1px solid var(--primary)' }} value={formData.context} readOnly />
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
    </div>
  );
}
