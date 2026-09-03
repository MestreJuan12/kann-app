import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  MoreHorizontal, 
  Plus, 
  X, 
  Edit3, 
  Trash2, 
  MessageCircle, 
  MapPin, 
  Settings, 
  SlidersHorizontal,
  ArrowUpDown,
  Clock,
  AlertTriangle,
  Download,
  RefreshCw,
  Sun,
  Moon,
  ZoomIn,
  Loader2,
  Check
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabaseClient';

const IMAGEN_DEFAULT = 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?auto=format&fit=crop&w=400&q=80';

export default function App() {
  const [tab, setTab] = useState('activos');
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [showModalForm, setShowModalForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, pedido: null });

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('app_theme') !== 'light');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('app_font') || '1x');

  const [filtroMadera, setFiltroMadera] = useState('TODAS');
  const [ordenFecha, setOrdenFecha] = useState('entrega');

  const [maderas, setMaderas] = useState([]);
  const [nuevaMadera, setNuevaMadera] = useState('');
  const [stockPatas, setStockPatas] = useState([]);
  const [nuevaPataNombre, setNuevaPataNombre] = useState('');
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    localStorage.setItem('app_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('app_font', fontSize);
  }, [fontSize]);

  const toggleFontSize = () => {
    if (fontSize === '1x') setFontSize('2x');
    else if (fontSize === '2x') setFontSize('3x');
    else if (fontSize === '3x') setFontSize('4x');
    else setFontSize('1x');
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [maderasRes, stockRes, pedidosRes] = await Promise.all([
        supabase.from('maderas').select('*').order('nombre'),
        supabase.from('stock_patas').select('*').order('nombre'),
        supabase.from('pedidos').select('*').order('created_at', { ascending: false })
      ]);

      if (maderasRes.data) setMaderas(maderasRes.data.map(m => m.nombre));
      if (stockRes.data) setStockPatas(stockRes.data);
      if (pedidosRes.data) {
        setPedidos(pedidosRes.data.map(p => ({
          id: p.id,
          fechaVenta: p.fecha_venta,
          fechaEntregaPactada: p.fecha_entrega_pactada,
          cliente: p.cliente,
          telefono: p.telefono,
          canal: p.canal,
          producto: p.producto,
          medidas: p.medidas,
          madera: p.madera,
          foto: p.foto || IMAGEN_DEFAULT,
          maderaLista: p.madera_lista,
          baseId: p.base_id,
          precioLista: Number(p.precio_lista || 0),
          cobroAdicional: Number(p.cobro_adicional || 0),
          envioCobrado: Number(p.envio_cobrado || 0),
          senia: Number(p.senia || 0),
          formaPago: p.forma_pago,
          tipoEntrega: p.tipo_entrega,
          localidadEnvio: p.localidad_envio,
          domicilioEnvio: p.domicilio_envio,
          entregado: p.entregado
        })));
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const initialFormState = {
    fechaVenta: new Date().toISOString().split('T')[0],
    fechaEntregaPactada: '',
    cliente: '',
    telefono: '',
    canal: 'WhatsApp',
    producto: '',
    medidas: '',
    madera: maderas[0] || 'Guayubira 40mm',
    foto: IMAGEN_DEFAULT,
    maderaLista: false,
    baseId: stockPatas[0]?.id || '',
    precioLista: '',
    cobroAdicional: '',
    envioCobrado: '',
    senia: '',
    formaPago: 'Efectivo',
    tipoEntrega: 'Flete',
    localidadEnvio: '',
    domicilioEnvio: '',
    entregado: false,
  };

  const [formData, setFormData] = useState(initialFormState);

  const calcularDiasRestantes = (fechaEntrega) => {
    if (!fechaEntrega) return null;
    const [y, m, d] = fechaEntrega.split('-').map(Number);
    const entrega = new Date(y, m - 1, d);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diffTime = entrega.getTime() - hoy.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const getBadgeDias = (dias) => {
    if (dias === null || dias === undefined) return null;
    if (dias < 0) {
      return (
        <span className="text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1">
          <AlertTriangle size={11} /> Atrasado ({Math.abs(dias)}d)
        </span>
      );
    }
    if (dias === 0) {
      return (
        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
          Entrega Hoy
        </span>
      );
    }
    if (dias <= 3) {
      return (
        <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1">
          <Clock size={11} /> {dias}d rest.
        </span>
      );
    }
    return (
      <span className="text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1">
        <Clock size={11} /> {dias}d
      </span>
    );
  };

  const executeToggleEntregado = async () => {
    if (!confirmModal.pedido) return;
    const { id, entregado } = confirmModal.pedido;
    const newStatus = !entregado;
    setPedidos(pedidos.map(p => p.id === id ? { ...p, entregado: newStatus } : p));
    setConfirmModal({ show: false, pedido: null });
    await supabase.from('pedidos').update({ entregado: newStatus }).eq('id', id);
  };

  const handleStockChange = async (id, delta) => {
    const item = stockPatas.find(p => p.id === id);
    if (!item) return;
    const nuevaCant = Math.max(0, item.cantidad + delta);
    setStockPatas(stockPatas.map(p => p.id === id ? { ...p, cantidad: nuevaCant } : p));
    await supabase.from('stock_patas').update({ cantidad: nuevaCant }).eq('id', id);
  };

  const handleSavePedido = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const payload = {
        fecha_venta: formData.fechaVenta || new Date().toISOString().split('T')[0],
        fecha_entrega_pactada: formData.fechaEntregaPactada || null,
        cliente: formData.cliente,
        telefono: formData.telefono,
        canal: formData.canal,
        producto: formData.producto,
        medidas: formData.medidas,
        madera: formData.madera,
        foto: formData.foto,
        madera_lista: formData.maderaLista,
        base_id: formData.baseId || null,
        precio_lista: Number(formData.precioLista || 0),
        cobro_adicional: Number(formData.cobroAdicional || 0),
        envio_cobrado: Number(formData.envioCobrado || 0),
        senia: Number(formData.senia || 0),
        forma_pago: formData.formaPago,
        tipo_entrega: formData.tipoEntrega,
        localidad_envio: formData.localidadEnvio,
        domicilio_envio: formData.domicilioEnvio,
        entregado: formData.entregado || false,
      };

      if (editingId) {
        const pedidoAnterior = pedidos.find(p => p.id === editingId);
        if (pedidoAnterior && pedidoAnterior.baseId !== formData.baseId) {
          if (pedidoAnterior.baseId) {
            const pataAnt = stockPatas.find(p => p.id === pedidoAnterior.baseId);
            if (pataAnt) await handleStockChange(pataAnt.id, 1);
          }
          if (formData.baseId) {
            const pataNueva = stockPatas.find(p => p.id === formData.baseId);
            if (pataNueva) await handleStockChange(pataNueva.id, -1);
          }
        }
        await supabase.from('pedidos').update(payload).eq('id', editingId);
      } else {
        const newId = Date.now().toString();
        if (formData.baseId) {
          const pata = stockPatas.find(p => p.id === formData.baseId);
          if (pata) await handleStockChange(pata.id, -1);
        }
        await supabase.from('pedidos').insert([{ ...payload, id: newId }]);
      }

      setShowModalForm(false);
      await fetchData();
    } catch (err) {
      console.error('Error al procesar el pedido:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePedido = async (id) => {
    const pedidoABorrar = pedidos.find(p => p.id === id);
    if (pedidoABorrar && pedidoABorrar.baseId) {
      const pata = stockPatas.find(p => p.id === pedidoABorrar.baseId);
      if (pata) await handleStockChange(pata.id, 1);
    }
    setPedidos(pedidos.filter(p => p.id !== id));
    setSelectedPedido(null);
    await supabase.from('pedidos').delete().eq('id', id);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setShowModalForm(true);
  };

  const handleOpenEdit = (pedido) => {
    setEditingId(pedido.id);
    setFormData(pedido);
    setSelectedPedido(null);
    setShowModalForm(true);
  };

  const handleAddPata = async (e) => {
    e.preventDefault();
    if (!nuevaPataNombre.trim()) return;
    const newId = 'b_' + Date.now();
    const nombre = nuevaPataNombre.toUpperCase().trim();
    setStockPatas([...stockPatas, { id: newId, nombre, cantidad: 0 }]);
    setNuevaPataNombre('');
    await supabase.from('stock_patas').insert([{ id: newId, nombre, cantidad: 0 }]);
  };

  const handleDeletePata = async (id) => {
    setStockPatas(stockPatas.filter(p => p.id !== id));
    await supabase.from('stock_patas').delete().eq('id', id);
  };

  const handleAddMadera = async (e) => {
    e.preventDefault();
    if (!nuevaMadera.trim()) return;
    const nombre = nuevaMadera.trim();
    setMaderas([...maderas, nombre]);
    setNuevaMadera('');
    await supabase.from('maderas').insert([{ nombre }]);
  };

  const handleDeleteMadera = async (madera) => {
    setMaderas(maderas.filter(m => m !== madera));
    await supabase.from('maderas').delete().eq('nombre', madera);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, foto: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const getBaseNombre = (id) => {
    const base = stockPatas.find(b => b.id === id);
    return base ? base.nombre : 'Sin base';
  };

  const generarPDF = (pedido) => {
    try {
      const doc = new jsPDF();
      const total = Number(pedido.precioLista || 0) + Number(pedido.cobroAdicional || 0) + Number(pedido.envioCobrado || 0);
      const senia = Number(pedido.senia || 0);
      const resta = total - senia;

      doc.setFillColor(24, 24, 27);
      doc.rect(0, 0, 210, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('ORDEN DE FABRICACION', 15, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(161, 161, 170);
      doc.text(`ID #${(pedido.id || '0000').slice(-5)}`, 150, 22);

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS DEL CLIENTE', 15, 48);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Cliente: ${pedido.cliente || '-'}`, 15, 56);
      doc.text(`Telefono: ${pedido.telefono || 'No especificado'}`, 15, 62);
      doc.text(`Destino: ${pedido.localidadEnvio || ''} (${pedido.domicilioEnvio || 'Taller'})`, 15, 68);

      autoTable(doc, {
        startY: 75,
        head: [['Concepto', 'Detalle', 'Monto']],
        body: [
          ['Producto', pedido.producto || '-', ''],
          ['Medidas', pedido.medidas || '-', ''],
          ['Madera', pedido.madera || '-', ''],
          ['Base', getBaseNombre(pedido.baseId), ''],
          ['Precio Base', 'Mueble', `$${Number(pedido.precioLista || 0).toLocaleString('es-AR')}`],
          ['Adicional', 'Modificaciones', `$${Number(pedido.cobroAdicional || 0).toLocaleString('es-AR')}`],
          ['Envio', pedido.localidadEnvio || 'Retiro', `$${Number(pedido.envioCobrado || 0).toLocaleString('es-AR')}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8.5 }
      });

      const finalY = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL: $${total.toLocaleString('es-AR')}`, 130, finalY);
      doc.text(`SENIA: $${senia.toLocaleString('es-AR')}`, 130, finalY + 6);
      doc.setTextColor(16, 185, 129);
      doc.text(`SALDO: $${resta.toLocaleString('es-AR')}`, 130, finalY + 12);

      doc.save(`Pedido_${(pedido.cliente || 'Comprobante').replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
    }
  };

  const enviarWhatsAppDetalle = (pedido) => {
    if (!pedido.telefono) {
      alert('Este pedido no tiene teléfono.');
      return;
    }
    const total = Number(pedido.precioLista || 0) + Number(pedido.cobroAdicional || 0) + Number(pedido.envioCobrado || 0);
    const senia = Number(pedido.senia || 0);
    const resta = total - senia;
    const cleanPhone = pedido.telefono.replace(/\D/g, '');

    const texto = `*Detalle de tu Pedido*\n\n` +
      `👤 *Cliente:* ${pedido.cliente}\n` +
      `🪑 *Modelo:* ${pedido.producto}\n` +
      `📐 *Medidas:* ${pedido.medidas}\n` +
      `🪵 *Madera:* ${pedido.madera}\n` +
      `🔩 *Base:* ${getBaseNombre(pedido.baseId)}\n` +
      (pedido.fechaEntregaPactada ? `📅 *Entrega estimada:* ${pedido.fechaEntregaPactada}\n` : '') +
      `📍 *Destino:* ${pedido.localidadEnvio || 'Taller'} ${pedido.domicilioEnvio ? `(${pedido.domicilioEnvio})` : ''}\n\n` +
      `💰 *Total:* $${total.toLocaleString('es-AR')}\n` +
      `💵 *Seña:* $${senia.toLocaleString('es-AR')}\n` +
      `⚡ *Saldo al entregar:* $${resta.toLocaleString('es-AR')}\n\n` +
      `¡Muchas gracias!`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const pedidosFiltrados = useMemo(() => {
    return pedidos
      .filter(p => tab === 'activos' ? !p.entregado : p.entregado)
      .filter(p => filtroMadera === 'TODAS' ? true : p.madera === filtroMadera)
      .sort((a, b) => {
        if (ordenFecha === 'entrega') {
          if (!a.fechaEntregaPactada) return 1;
          if (!b.fechaEntregaPactada) return -1;
          return new Date(a.fechaEntregaPactada) - new Date(b.fechaEntregaPactada);
        }
        const dateA = new Date(a.fechaVenta || 0).getTime();
        const dateB = new Date(b.fechaVenta || 0).getTime();
        return ordenFecha === 'desc' ? dateB - dateA : dateA - dateB;
      });
  }, [pedidos, tab, filtroMadera, ordenFecha]);

  const metricas = useMemo(() => {
    const act = pedidos.filter(p => !p.entregado);
    const fin = pedidos.filter(p => p.entregado);

    const calcTotales = (lista) => lista.reduce((acc, p) => {
      const total = Number(p.precioLista || 0) + Number(p.cobroAdicional || 0) + Number(p.envioCobrado || 0);
      const senia = Number(p.senia || 0);
      return { bruto: acc.bruto + total, resta: acc.resta + (total - senia) };
    }, { bruto: 0, resta: 0 });

    return {
      activosCount: act.length,
      finalizadosCount: fin.length,
      activosMetricas: calcTotales(act),
      finalizadosMetricas: calcTotales(fin)
    };
  }, [pedidos]);

  // Variables de diseño tipo SaaS (Zinc/Slate)
  const bgMain = darkMode ? 'bg-zinc-950 text-zinc-100 border-zinc-900' : 'bg-zinc-50 text-zinc-900 border-zinc-200';
  const bgCard = darkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm';
  const bgInput = darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-500' : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400';
  const textMuted = darkMode ? 'text-zinc-400' : 'text-zinc-500';

  const rootScale = 
    fontSize === '4x' ? 'text-xl' :
    fontSize === '3x' ? 'text-lg' :
    fontSize === '2x' ? 'text-sm' : 'text-xs';

  return (
    <div className={`max-w-md mx-auto min-h-screen ${bgMain} flex flex-col font-sans border-x shadow-2xl pb-16 transition-colors duration-150 ${rootScale}`}>
      
      {/* Header */}
      <header className={`${darkMode ? 'bg-zinc-950/90 border-zinc-800/80' : 'bg-white/95 border-zinc-200'} backdrop-blur-md border-b py-3 px-3.5 sticky top-0 z-20 flex justify-between items-center`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 font-bold flex items-center justify-center text-xs shadow-inner">
            K
          </div>
          <span className="text-xs font-semibold tracking-wider uppercase font-mono">
            TALLER
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button 
            onClick={toggleFontSize}
            title="Aumentar tamaño de texto"
            className={`px-2 py-1 rounded-md border font-mono text-[11px] font-medium flex items-center gap-1 transition ${
              fontSize !== '1x' 
                ? 'bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 font-bold' 
                : darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'
            }`}>
            <ZoomIn size={13} />
            <span>{fontSize}</span>
          </button>

          <button 
            onClick={() => setDarkMode(!darkMode)}
            title="Tema"
            className={`p-1.5 rounded-md border transition ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'}`}>
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button 
            onClick={fetchData}
            title="Sincronizar"
            className={`p-1.5 rounded-md border transition ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-600'}`}>
            <RefreshCw size={15} className={loading ? 'animate-spin text-zinc-400' : ''} />
          </button>

          <button 
            onClick={() => setTab('ajustes')} 
            className={`p-1.5 rounded-md border transition ${tab === 'ajustes' ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-600'}`}>
            <Settings size={15} />
          </button>

          <button 
            onClick={handleOpenCreate} 
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-100 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-1 shadow-sm transition active:scale-95">
            <Plus size={14} />
            <span>Nuevo</span>
          </button>
        </div>
      </header>

      {/* Tarjetas Resumen */}
      <div className={`p-3 border-b ${darkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-zinc-100/60 border-zinc-200'} grid grid-cols-2 gap-2`}>
        <div className={`${bgCard} p-3 rounded-xl border`}>
          <span className={`text-[10px] ${textMuted} uppercase font-semibold block tracking-wider`}>
            {tab === 'finalizados' ? 'Facturado' : 'En Fabricación'}
          </span>
          <span className="text-base font-bold tracking-tight block mt-0.5">
            ${(tab === 'finalizados' ? metricas.finalizadosMetricas.bruto : metricas.activosMetricas.bruto).toLocaleString('es-AR')}
          </span>
        </div>
        <div className={`${bgCard} p-3 rounded-xl border`}>
          <span className={`text-[10px] ${textMuted} uppercase font-semibold block tracking-wider`}>
            {tab === 'finalizados' ? 'Cobrado' : 'Por Cobrar'}
          </span>
          <span className="text-base font-bold tracking-tight text-emerald-500 block mt-0.5">
            ${(tab === 'finalizados' ? metricas.finalizadosMetricas.bruto : metricas.activosMetricas.resta).toLocaleString('es-AR')}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="p-3 pb-1">
        <div className={`grid grid-cols-3 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-200 border-zinc-300'} p-1 rounded-xl border text-xs font-medium`}>
          <button 
            onClick={() => setTab('activos')} 
            className={`py-1.5 rounded-lg transition-all ${tab === 'activos' ? 'bg-zinc-950 text-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 shadow-sm font-semibold' : textMuted}`}>
            Activos ({metricas.activosCount})
          </button>
          <button 
            onClick={() => setTab('finalizados')} 
            className={`py-1.5 rounded-lg transition-all ${tab === 'finalizados' ? 'bg-zinc-950 text-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 shadow-sm font-semibold' : textMuted}`}>
            Finalizados ({metricas.finalizadosCount})
          </button>
          <button 
            onClick={() => setTab('stock')} 
            className={`py-1.5 rounded-lg transition-all ${tab === 'stock' ? 'bg-zinc-950 text-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 shadow-sm font-semibold' : textMuted}`}>
            Bases
          </button>
        </div>
      </div>

      {/* Filtros */}
      {(tab === 'activos' || tab === 'finalizados') && (
        <div className="px-3 pb-2 flex items-center gap-2">
          <div className={`flex-1 ${bgCard} border rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xs`}>
            <SlidersHorizontal size={13} className={textMuted} />
            <select 
              value={filtroMadera} 
              onChange={e => setFiltroMadera(e.target.value)}
              className="bg-transparent outline-none w-full font-medium cursor-pointer">
              <option value="TODAS" className={darkMode ? 'bg-zinc-900' : 'bg-white'}>Todas las maderas</option>
              {maderas.map(m => (
                <option key={m} value={m} className={darkMode ? 'bg-zinc-900' : 'bg-white'}>{m}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => setOrdenFecha(ordenFecha === 'entrega' ? 'desc' : ordenFecha === 'desc' ? 'asc' : 'entrega')}
            className={`${bgCard} border px-2.5 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5`}>
            <ArrowUpDown size={12} className={textMuted} />
            <span>{ordenFecha === 'entrega' ? 'Por Entrega' : ordenFecha === 'desc' ? 'Recientes' : 'Antiguos'}</span>
          </button>
        </div>
      )}

      {/* Lista de Pedidos */}
      <main className="p-3 flex-1 space-y-2.5 overflow-y-auto">
        {tab === 'activos' || tab === 'finalizados' ? (
          pedidosFiltrados.length === 0 ? (
            <div className={`text-center py-20 ${textMuted} text-xs`}>
              {loading ? 'Cargando datos...' : 'No hay pedidos en esta sección.'}
            </div>
          ) : (
            pedidosFiltrados.map((pedido) => {
              const totalVenta = Number(pedido.precioLista || 0) + Number(pedido.cobroAdicional || 0) + Number(pedido.envioCobrado || 0);
              const restan = totalVenta - Number(pedido.senia || 0);
              const diasRestantes = calcularDiasRestantes(pedido.fechaEntregaPactada);

              return (
                <div 
                  key={pedido.id} 
                  className={`${bgCard} border rounded-xl p-3 flex gap-3 items-center hover:border-zinc-500/30 transition-all`}>
                  
                  <img 
                    src={pedido.foto || IMAGEN_DEFAULT} 
                    alt={pedido.producto} 
                    className="w-16 h-16 rounded-lg object-cover border border-zinc-700/40 flex-shrink-0 bg-zinc-900" 
                  />

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs tracking-tight truncate">
                        {pedido.cliente}
                      </span>
                      {!pedido.entregado && getBadgeDias(diasRestantes)}
                      {pedido.maderaLista && (
                        <span className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          Madera lista
                        </span>
                      )}
                    </div>

                    <h4 className="font-medium text-xs truncate">{pedido.producto}</h4>
                    <p className={`text-[11px] ${textMuted} truncate`}>{pedido.medidas} • {pedido.madera}</p>

                    {pedido.localidadEnvio && (
                      <p className={`text-[11px] ${textMuted} flex items-center gap-1 truncate`}>
                        <MapPin size={11} className="flex-shrink-0" /> {pedido.localidadEnvio}
                      </p>
                    )}

                    <div className="pt-1.5 flex items-center justify-between border-t border-zinc-800/40 dark:border-zinc-800/80 text-xs">
                      <span className="font-bold text-emerald-500">
                        ${restan.toLocaleString('es-AR')}
                      </span>
                      <span className={`text-[11px] ${textMuted} font-mono`}>
                        Tot: ${totalVenta.toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-between gap-3 self-stretch py-0.5">
                    <div className="flex flex-col gap-1 items-center">
                      <button 
                        onClick={() => setSelectedPedido(pedido)} 
                        className={`p-1 rounded hover:bg-zinc-800/50 ${textMuted} hover:text-zinc-100`}>
                        <MoreHorizontal size={17} />
                      </button>
                      <button 
                        onClick={() => enviarWhatsAppDetalle(pedido)}
                        className="p-1 rounded text-emerald-500 hover:bg-emerald-500/10 active:scale-95 transition">
                        <MessageCircle size={17} />
                      </button>
                    </div>

                    <button 
                      onClick={() => setConfirmModal({ show: true, pedido })} 
                      title={pedido.entregado ? "Marcar pendiente" : "Marcar entregado"}
                      className="transition-transform active:scale-90">
                      {pedido.entregado ? (
                        <CheckCircle2 size={24} className="text-emerald-500" />
                      ) : (
                        <Circle size={24} className="text-zinc-600 hover:text-zinc-400" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )
        ) : tab === 'stock' ? (
          <div className="space-y-2">
            {stockPatas.map(pata => (
              <div key={pata.id} className={`${bgCard} border p-3 rounded-xl flex justify-between items-center`}>
                <div className="flex-1 pr-2">
                  <h4 className="font-semibold text-xs">{pata.nombre}</h4>
                  <span className={`text-[11px] ${pata.cantidad <= 1 ? 'text-rose-500 font-semibold' : textMuted}`}>
                    {pata.cantidad <= 1 ? '¡Poco Stock!' : 'Estructura metálica'}
                  </span>
                </div>
                
                <div className={`flex items-center gap-2 ${darkMode ? 'bg-zinc-950' : 'bg-zinc-100'} p-1 rounded-lg border ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                  <button 
                    onClick={() => handleStockChange(pata.id, -1)}
                    className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold flex items-center justify-center active:scale-95">
                    -
                  </button>
                  <span className="font-bold text-xs w-6 text-center">
                    {pata.cantidad}
                  </span>
                  <button 
                    onClick={() => handleStockChange(pata.id, 1)}
                    className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold flex items-center justify-center active:scale-95">
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`${bgCard} border p-4 rounded-xl space-y-3`}>
              <h3 className="font-semibold text-xs uppercase tracking-wider text-zinc-400">Maderas Disponibles</h3>
              <form onSubmit={handleAddMadera} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ej: Incienso 40mm"
                  value={nuevaMadera}
                  onChange={e => setNuevaMadera(e.target.value)}
                  className={`flex-1 border rounded-lg px-3 py-1.5 ${bgInput} outline-none text-xs`} 
                />
                <button type="submit" className="bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-semibold">
                  Agregar
                </button>
              </form>

              <div className="space-y-1.5 pt-1">
                {maderas.map(m => (
                  <div key={m} className={`flex justify-between items-center ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'} px-3 py-2 rounded-lg border text-xs`}>
                    <span>{m}</span>
                    <button onClick={() => handleDeleteMadera(m)} className="text-zinc-400 hover:text-rose-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${bgCard} border p-4 rounded-xl space-y-3`}>
              <h3 className="font-semibold text-xs uppercase tracking-wider text-zinc-400">Bases de Hierro</h3>
              <form onSubmit={handleAddPata} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ej: BASE TRAPECIO 80X70"
                  value={nuevaPataNombre}
                  onChange={e => setNuevaPataNombre(e.target.value)}
                  className={`flex-1 border rounded-lg px-3 py-1.5 ${bgInput} outline-none text-xs`} 
                />
                <button type="submit" className="bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-semibold">
                  Agregar
                </button>
              </form>

              <div className="space-y-1.5 pt-1">
                {stockPatas.map(p => (
                  <div key={p.id} className={`flex justify-between items-center ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'} px-3 py-2 rounded-lg border text-xs`}>
                    <span>{p.nombre}</span>
                    <button onClick={() => handleDeletePata(p.id)} className="text-zinc-400 hover:text-rose-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Confirmación */}
      {confirmModal.show && confirmModal.pedido && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'} border w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl`}>
            <div>
              <h3 className="font-bold text-sm">
                {confirmModal.pedido.entregado ? '¿Reactivar pedido?' : '¿Finalizar entrega?'}
              </h3>
              <p className={`text-xs ${textMuted} mt-1`}>
                {confirmModal.pedido.entregado
                  ? 'El pedido volverá a la lista de activos.'
                  : 'El pedido se marcará como completado y pasará a finalizados.'}
              </p>
            </div>

            <div className={`${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'} p-3 rounded-lg border text-xs space-y-1 font-mono`}>
              <p><span className="text-zinc-500">Cliente:</span> {confirmModal.pedido.cliente}</p>
              <p><span className="text-zinc-500">Modelo:</span> {confirmModal.pedido.producto}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button 
                type="button" 
                onClick={() => setConfirmModal({ show: false, pedido: null })}
                className={`py-2 rounded-lg font-medium text-xs border ${darkMode ? 'border-zinc-800 hover:bg-zinc-800' : 'border-zinc-200 hover:bg-zinc-100'}`}>
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={executeToggleEntregado}
                className="py-2 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow transition">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {selectedPedido && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className={`${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'} border-t sm:border w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <span className="text-xs text-zinc-400 font-semibold">{selectedPedido.cliente}</span>
                <h3 className="font-bold text-base">{selectedPedido.producto}</h3>
              </div>
              <button onClick={() => setSelectedPedido(null)} className="p-1 rounded-md text-zinc-400 hover:text-zinc-100"><X size={18} /></button>
            </div>

            <div className={`${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'} p-3.5 rounded-xl border space-y-2 text-xs`}>
              <div className="flex justify-between"><span className={textMuted}>Venta:</span><span>{selectedPedido.fechaVenta}</span></div>
              {selectedPedido.fechaEntregaPactada && (
                <div className="flex justify-between"><span className="text-amber-500 font-semibold">Entrega límite:</span><span className="font-semibold text-amber-500">{selectedPedido.fechaEntregaPactada}</span></div>
              )}
              <div className="flex justify-between"><span className={textMuted}>Medidas:</span><span>{selectedPedido.medidas}</span></div>
              <div className="flex justify-between"><span className={textMuted}>Madera:</span><span className="font-medium">{selectedPedido.madera}</span></div>
              <div className="flex justify-between"><span className={textMuted}>Base:</span><span>{getBaseNombre(selectedPedido.baseId)}</span></div>
              {selectedPedido.localidadEnvio && (
                <div className="flex justify-between"><span className={textMuted}>Destino:</span><span>{selectedPedido.localidadEnvio}</span></div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="border border-zinc-800 p-3 rounded-lg">
                <span className={`text-[10px] ${textMuted} uppercase font-semibold block`}>Total</span>
                <span className="font-bold text-sm block mt-0.5">
                  ${(Number(selectedPedido.precioLista || 0) + Number(selectedPedido.cobroAdicional || 0) + Number(selectedPedido.envioCobrado || 0)).toLocaleString('es-AR')}
                </span>
              </div>
              <div className="border border-emerald-500/20 bg-emerald-500/5 p-3 rounded-lg">
                <span className="text-[10px] text-emerald-500 uppercase font-semibold block">Resta Cobrar</span>
                <span className="font-bold text-sm text-emerald-500 block mt-0.5">
                  ${(Number(selectedPedido.precioLista || 0) + Number(selectedPedido.cobroAdicional || 0) + Number(selectedPedido.envioCobrado || 0) - Number(selectedPedido.senia || 0)).toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => enviarWhatsAppDetalle(selectedPedido)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition text-xs">
                  <MessageCircle size={16} /> WhatsApp
                </button>
                <button 
                  onClick={() => generarPDF(selectedPedido)}
                  className={`font-semibold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition border text-xs ${
                    darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-zinc-100 border-zinc-300 text-zinc-800'
                  }`}>
                  <Download size={16} /> PDF
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenEdit(selectedPedido)}
                  className="flex-1 bg-zinc-100 hover:bg-white text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 border border-zinc-700 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition text-xs">
                  <Edit3 size={15} /> Modificar
                </button>
                <button 
                  onClick={() => handleDeletePedido(selectedPedido.id)}
                  className="bg-rose-950/40 hover:bg-rose-900 border border-rose-800 text-rose-300 px-3.5 py-2.5 rounded-lg font-bold flex items-center justify-center transition">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Formulario */}
      {showModalForm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <form onSubmit={handleSavePedido} className={`${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'} border-t sm:border w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-3.5 max-h-[92vh] overflow-y-auto`}>
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm">
                {editingId ? 'Editar Pedido' : 'Nuevo Pedido'}
              </h3>
              <button type="button" onClick={() => setShowModalForm(false)} className="p-1 text-zinc-400 hover:text-zinc-100"><X size={18} /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block mb-1 font-medium ${textMuted}`}>Fecha Venta</label>
                  <input 
                    type="date" 
                    required
                    value={formData.fechaVenta} 
                    onChange={e => setFormData({ ...formData, fechaVenta: e.target.value })}
                    className={`w-full border rounded-lg p-2 ${bgInput} outline-none`} 
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-amber-500">Pactado Entrega</label>
                  <input 
                    type="date" 
                    value={formData.fechaEntregaPactada} 
                    onChange={e => setFormData({ ...formData, fechaEntregaPactada: e.target.value })}
                    className={`w-full border rounded-lg p-2 ${bgInput} text-amber-500 font-semibold outline-none`} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block mb-1 font-medium ${textMuted}`}>Cliente</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Nombre"
                    value={formData.cliente} 
                    onChange={e => setFormData({ ...formData, cliente: e.target.value })}
                    className={`w-full border rounded-lg p-2 ${bgInput} outline-none`} 
                  />
                </div>
                <div>
                  <label className={`block mb-1 font-medium ${textMuted}`}>Teléfono</label>
                  <input 
                    type="text" 
                    placeholder="WhatsApp"
                    value={formData.telefono} 
                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                    className={`w-full border rounded-lg p-2 ${bgInput} outline-none`} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block mb-1 font-medium ${textMuted}`}>Producto</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej: Mesa Comedor"
                    value={formData.producto} 
                    onChange={e => setFormData({ ...formData, producto: e.target.value })}
                    className={`w-full border rounded-lg p-2 ${bgInput} outline-none`} 
                  />
                </div>
                <div>
                  <label className={`block mb-1 font-medium ${textMuted}`}>Medidas</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 2.00 x 1.00 m"
                    value={formData.medidas} 
                    onChange={e => setFormData({ ...formData, medidas: e.target.value })}
                    className={`w-full border rounded-lg p-2 ${bgInput} outline-none`} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block mb-1 font-medium ${textMuted}`}>Madera</label>
                  <select 
                    value={formData.madera} 
                    onChange={e => setFormData({ ...formData, madera: e.target.value })}
                    className={`w-full border rounded-lg p-2 ${bgInput} outline-none font-medium`}>
                    {maderas.map((m) => (
                      <option key={m} value={m} className={darkMode ? 'bg-zinc-900' : 'bg-white'}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block mb-1 font-medium ${textMuted}`}>Base</label>
                  <select 
                    value={formData.baseId} 
                    onChange={e => setFormData({ ...formData, baseId: e.target.value })}
                    className={`w-full border rounded-lg p-2 ${bgInput} outline-none font-medium`}>
                    {stockPatas.map(b => (
                      <option key={b.id} value={b.id} className={darkMode ? 'bg-zinc-900' : 'bg-white'}>
                        {b.nombre} ({b.cantidad} disp.)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-zinc-800/80 pt-2">
                <div>
                  <label className={`block mb-1 font-medium ${textMuted}`}>Localidad</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Avellaneda"
                    value={formData.localidadEnvio} 
                    onChange={e => setFormData({ ...formData, localidadEnvio: e.target.value })}
                    className={`w-full border rounded-lg p-2 ${bgInput} outline-none`} 
                  />
                </div>
                <div>
                  <label className={`block mb-1 font-medium ${textMuted}`}>Dirección</label>
                  <input 
                    type="text" 
                    placeholder="Calle, Altura"
                    value={formData.domicilioEnvio} 
                    onChange={e => setFormData({ ...formData, domicilioEnvio: e.target.value })}
                    className={`w-full border rounded-lg p-2 ${bgInput} outline-none`} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block mb-1 font-medium ${textMuted}`}>Precio Base ($)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={formData.precioLista} 
                    onChange={e => setFormData({ ...formData, precioLista: e.target.value })}
                    className={`w-full border rounded-lg p-2 ${bgInput} outline-none`} 
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-emerald-500">Seña Pagada ($)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={formData.senia} 
                    onChange={e => setFormData({ ...formData, senia: e.target.value })}
                    className={`w-full border rounded-lg p-2 ${bgInput} outline-none font-semibold text-emerald-500`} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block mb-1 font-medium ${textMuted}`}>Adicional ($)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={formData.cobroAdicional} 
                    onChange={e => setFormData({ ...formData, cobroAdicional: e.target.value })}
                    className={`w-full border rounded-lg p-2 ${bgInput} outline-none`} 
                  />
                </div>
                <div>
                  <label className={`block mb-1 font-medium ${textMuted}`}>Envío ($)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={formData.envioCobrado} 
                    onChange={e => setFormData({ ...formData, envioCobrado: e.target.value })}
                    className={`w-full border rounded-lg p-2 ${bgInput} outline-none`} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 items-center">
                <label className={`flex items-center gap-2 border rounded-lg p-2 ${bgInput} cursor-pointer`}>
                  <input 
                    type="checkbox" 
                    checked={formData.maderaLista} 
                    onChange={e => setFormData({ ...formData, maderaLista: e.target.checked })}
                    className="w-4 h-4 rounded" 
                  />
                  <span className="font-medium">Madera lista</span>
                </label>

                <label className={`flex items-center justify-center border rounded-lg p-2 ${bgInput} cursor-pointer text-center font-medium`}>
                  Subir foto
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-2.5 rounded-lg uppercase tracking-wider text-xs transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>{editingId ? 'Guardar Cambios' : 'Crear Pedido'}</span>
              )}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
