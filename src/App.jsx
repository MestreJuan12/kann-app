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
  ZoomIn
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

  // Opciones de accesibilidad y tema (guardadas en memoria local)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('kann_theme') !== 'light');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('kann_font') || 'normal'); // 'normal' | 'lg' | 'xl'

  const [filtroMadera, setFiltroMadera] = useState('TODAS');
  const [ordenFecha, setOrdenFecha] = useState('entrega');

  const [maderas, setMaderas] = useState([]);
  const [nuevaMadera, setNuevaMadera] = useState('');
  const [stockPatas, setStockPatas] = useState([]);
  const [nuevaPataNombre, setNuevaPataNombre] = useState('');
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    localStorage.setItem('kann_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('kann_font', fontSize);
  }, [fontSize]);

  const toggleFontSize = () => {
    if (fontSize === 'normal') setFontSize('lg');
    else if (fontSize === 'lg') setFontSize('xl');
    else setFontSize('normal');
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
      console.error('Error cargando datos de Supabase:', err);
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
        <span className={`bg-rose-950/90 border border-rose-700 text-rose-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${fontSize === 'xl' ? 'text-xs' : 'text-[10px]'}`}>
          <AlertTriangle size={12} /> Atrasado ({Math.abs(dias)}d)
        </span>
      );
    }
    if (dias === 0) {
      return (
        <span className={`bg-amber-500 text-stone-950 font-black px-1.5 py-0.5 rounded ${fontSize === 'xl' ? 'text-xs' : 'text-[10px]'}`}>
          ¡Entrega Hoy!
        </span>
      );
    }
    if (dias <= 3) {
      return (
        <span className={`bg-amber-950/90 border border-amber-600 text-amber-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${fontSize === 'xl' ? 'text-xs' : 'text-[10px]'}`}>
          <Clock size={12} /> {dias} días rest.
        </span>
      );
    }
    return (
      <span className={`bg-neutral-800 text-neutral-300 border border-neutral-700 font-medium px-1.5 py-0.5 rounded flex items-center gap-1 ${fontSize === 'xl' ? 'text-xs' : 'text-[10px]'}`}>
        <Clock size={12} /> {dias} días
      </span>
    );
  };

  const toggleEntregado = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    setPedidos(pedidos.map(p => p.id === id ? { ...p, entregado: newStatus } : p));
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
      cobroAdicional: Number(formData.cobroAdicional || 0),
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
    fetchData();
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

      doc.setFillColor(18, 18, 18);
      doc.rect(0, 0, 210, 38, 'F');
      
      doc.setTextColor(217, 119, 6);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('KANN', 15, 20);
      
      doc.setFontSize(9);
      doc.setTextColor(180, 180, 180);
      doc.setFont('helvetica', 'normal');
      doc.text('MUEBLES & DISENO INDUSTRIAL', 15, 28);
      
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(`ORDEN #${(pedido.id || '0000').slice(-5)}`, 140, 20);
      doc.text(`Fecha: ${pedido.fechaVenta || 'S/D'}`, 140, 28);

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS DE LA ORDEN', 15, 48);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Cliente: ${pedido.cliente || '-'}`, 15, 56);
      doc.text(`Telefono: ${pedido.telefono || 'No especificado'}`, 15, 62);
      doc.text(`Entrega: ${pedido.tipoEntrega || 'A coordinar'} - ${pedido.localidadEnvio || ''} (${pedido.domicilioEnvio || 'Sin direccion'})`, 15, 68);
      if (pedido.fechaEntregaPactada) {
        doc.text(`Fecha pactada de entrega: ${pedido.fechaEntregaPactada}`, 15, 74);
      }

      autoTable(doc, {
        startY: pedido.fechaEntregaPactada ? 80 : 76,
        head: [['Concepto / Item', 'Detalle', 'Subtotal']],
        body: [
          ['Producto / Modelo', pedido.producto || '-', ''],
          ['Medidas', pedido.medidas || '-', ''],
          ['Tipo de Madera', pedido.madera || '-', ''],
          ['Base de Hierro', getBaseNombre(pedido.baseId), ''],
          ['Precio Lista Base', 'Fabricacion estandar', `$${Number(pedido.precioLista || 0).toLocaleString('es-AR')}`],
          ['Adicional', 'Medidas especiales / Lustre / Extras', `$${Number(pedido.cobroAdicional || 0).toLocaleString('es-AR')}`],
          ['Costo de Envio / Flete', pedido.localidadEnvio || 'Retira', `$${Number(pedido.envioCobrado || 0).toLocaleString('es-AR')}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [18, 18, 18], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8.5 }
      });

      const finalY = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text(`TOTAL GENERAL: $${total.toLocaleString('es-AR')}`, 125, finalY);
      
      doc.setTextColor(217, 119, 6);
      doc.text(`SENA ABONADA: $${senia.toLocaleString('es-AR')}`, 125, finalY + 6);
      
      doc.setTextColor(16, 185, 129);
      doc.text(`SALDO AL RECIBIR: $${resta.toLocaleString('es-AR')}`, 125, finalY + 12);

      doc.setTextColor(130, 130, 130);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('KANN - Herreria y Carpinteria a medida.', 15, 280);

      doc.save(`Comprobante_KANN_${(pedido.cliente || 'Pedido').replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
    }
  };

  const enviarWhatsAppDetalle = (pedido) => {
    if (!pedido.telefono) {
      alert('Este pedido no tiene teléfono asignado.');
      return;
    }
    const total = Number(pedido.precioLista || 0) + Number(pedido.cobroAdicional || 0) + Number(pedido.envioCobrado || 0);
    const senia = Number(pedido.senia || 0);
    const resta = total - senia;
    const cleanPhone = pedido.telefono.replace(/\D/g, '');

    const texto = `*KANN | Detalle de tu Pedido*\n\n` +
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
      `¡Muchas gracias por confiar en KANN!`;

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

  // Estilos adaptativos de tema y escala
  const rootScale = fontSize === 'xl' ? 'text-base leading-relaxed' : fontSize === 'lg' ? 'text-sm' : 'text-xs';
  const bgMain = darkMode ? 'bg-neutral-950 text-neutral-100 border-neutral-900' : 'bg-stone-100 text-stone-900 border-stone-300';
  const bgCard = darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-stone-200 shadow-sm';
  const bgInput = darkMode ? 'bg-neutral-950 border-neutral-800 text-neutral-100' : 'bg-stone-50 border-stone-300 text-stone-900';
  const textMuted = darkMode ? 'text-neutral-400' : 'text-stone-500';

  return (
    <div className={`max-w-md mx-auto min-h-screen ${bgMain} flex flex-col font-sans border-x shadow-2xl pb-12 transition-colors duration-200 ${rootScale}`}>
      
      {/* Header */}
      <header className={`${darkMode ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white/95 border-stone-200'} backdrop-blur-md border-b py-2.5 px-3 sticky top-0 z-20 flex justify-between items-center transition-colors`}>
        <div className="flex items-center gap-2">
          <img 
            src="/logo.png" 
            alt="KANN" 
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
            className="w-8 h-8 rounded-full object-cover border border-amber-600 shadow" 
          />
          <h1 className="text-base font-black tracking-widest uppercase leading-none">
            KANN
          </h1>
        </div>

        {/* Acciones de cabecera */}
        <div className="flex items-center gap-1">
          <button 
            onClick={toggleFontSize}
            title="Cambiar tamaño de letra"
            className={`px-2 py-1.5 rounded-lg border font-black text-[11px] flex items-center gap-0.5 transition ${
              fontSize !== 'normal' ? 'bg-amber-600 text-stone-950 border-amber-500' : darkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-300' : 'bg-stone-100 border-stone-300 text-stone-700'
            }`}>
            <ZoomIn size={14} />
            <span>{fontSize === 'normal' ? '1x' : fontSize === 'lg' ? '1.5x' : '2x'}</span>
          </button>

          <button 
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className={`p-1.5 rounded-lg border transition ${darkMode ? 'bg-neutral-900 border-neutral-800 text-amber-400' : 'bg-stone-100 border-stone-300 text-stone-800'}`}>
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button 
            onClick={fetchData}
            title="Sincronizar"
            className={`p-1.5 rounded-lg border transition ${darkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-stone-100 border-stone-300 text-stone-600'}`}>
            <RefreshCw size={16} className={loading ? 'animate-spin text-amber-500' : ''} />
          </button>

          <button 
            onClick={() => setTab('ajustes')} 
            className={`p-1.5 rounded-lg border transition ${tab === 'ajustes' ? 'bg-amber-600 border-amber-500 text-stone-950' : darkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-stone-100 border-stone-300 text-stone-600'}`}>
            <Settings size={16} />
          </button>

          <button 
            onClick={handleOpenCreate} 
            className="bg-amber-600 hover:bg-amber-500 text-stone-950 px-2.5 py-1.5 rounded-lg font-black text-xs flex items-center gap-0.5 shadow transition">
            <Plus size={15} strokeWidth={3} />
            <span>NUEVO</span>
          </button>
        </div>
      </header>

      {/* Tarjetas resumen métricas */}
      <div className={`p-2.5 ${darkMode ? 'bg-neutral-900/50 border-neutral-800/80' : 'bg-stone-200/50 border-stone-300'} border-b grid grid-cols-2 gap-2`}>
        <div className={`${bgCard} p-2.5 rounded-xl border`}>
          <span className={`text-[10px] ${textMuted} uppercase font-bold block`}>
            {tab === 'finalizados' ? 'Facturado Finalizados' : 'En Juego Activos'}
          </span>
          <span className="text-base font-black text-amber-500">
            ${(tab === 'finalizados' ? metricas.finalizadosMetricas.bruto : metricas.activosMetricas.bruto).toLocaleString('es-AR')}
          </span>
        </div>
        <div className={`${bgCard} p-2.5 rounded-xl border`}>
          <span className={`text-[10px] ${textMuted} uppercase font-bold block`}>
            {tab === 'finalizados' ? 'Cobrado Total' : 'Por Cobrar Activos'}
          </span>
          <span className="text-base font-black text-emerald-500">
            ${(tab === 'finalizados' ? metricas.finalizadosMetricas.bruto : metricas.activosMetricas.resta).toLocaleString('es-AR')}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="p-2.5 pb-1">
        <nav className={`grid grid-cols-3 ${darkMode ? 'bg-neutral-900/80 border-neutral-800' : 'bg-stone-200 border-stone-300'} p-1 rounded-xl border font-bold text-xs`}>
          <button 
            onClick={() => setTab('activos')} 
            className={`py-2 rounded-lg transition-all ${tab === 'activos' ? 'bg-amber-600 text-stone-950 shadow font-extrabold' : textMuted}`}>
            ACTIVOS ({metricas.activosCount})
          </button>
          <button 
            onClick={() => setTab('finalizados')} 
            className={`py-2 rounded-lg transition-all ${tab === 'finalizados' ? 'bg-amber-600 text-stone-950 shadow font-extrabold' : textMuted}`}>
            FINALIZADOS ({metricas.finalizadosCount})
          </button>
          <button 
            onClick={() => setTab('stock')} 
            className={`py-2 rounded-lg transition-all ${tab === 'stock' ? 'bg-amber-600 text-stone-950 shadow font-extrabold' : textMuted}`}>
            STOCK BASES
          </button>
        </nav>
      </div>

      {/* Filtros */}
      {(tab === 'activos' || tab === 'finalizados') && (
        <div className="px-2.5 pb-2 flex items-center gap-2">
          <div className={`flex-1 ${bgCard} border rounded-xl px-2.5 py-1.5 flex items-center gap-1.5`}>
            <SlidersHorizontal size={14} className={textMuted} />
            <select 
              value={filtroMadera} 
              onChange={e => setFiltroMadera(e.target.value)}
              className={`bg-transparent font-bold outline-none w-full ${darkMode ? 'text-neutral-200' : 'text-stone-800'}`}>
              <option value="TODAS" className={darkMode ? 'bg-neutral-900' : 'bg-white'}>Todas las maderas</option>
              {maderas.map(m => (
                <option key={m} value={m} className={darkMode ? 'bg-neutral-900' : 'bg-white'}>{m}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => setOrdenFecha(ordenFecha === 'entrega' ? 'desc' : ordenFecha === 'desc' ? 'asc' : 'entrega')}
            className={`${bgCard} border px-3 py-1.5 rounded-xl font-bold flex items-center gap-1`}>
            <ArrowUpDown size={13} className="text-amber-500" />
            <span>
              {ordenFecha === 'entrega' ? 'Por Entrega' : ordenFecha === 'desc' ? 'Más recientes' : 'Más antiguos'}
            </span>
          </button>
        </div>
      )}

      {/* Contenido principal */}
      <main className="p-2.5 flex-1 space-y-2.5 overflow-y-auto">
        {tab === 'activos' || tab === 'finalizados' ? (
          pedidosFiltrados.length === 0 ? (
            <div className={`text-center py-16 ${textMuted}`}>
              {loading ? 'Cargando pedidos...' : 'No se encontraron pedidos.'}
            </div>
          ) : (
            pedidosFiltrados.map((pedido) => {
              const totalVenta = Number(pedido.precioLista || 0) + Number(pedido.cobroAdicional || 0) + Number(pedido.envioCobrado || 0);
              const restan = totalVenta - Number(pedido.senia || 0);
              const diasRestantes = calcularDiasRestantes(pedido.fechaEntregaPactada);

              return (
                <div 
                  key={pedido.id} 
                  className={`${bgCard} border rounded-2xl p-3 shadow-md relative overflow-hidden flex gap-3 items-center`}>
                  
                  <img 
                    src={pedido.foto || IMAGEN_DEFAULT} 
                    alt={pedido.producto} 
                    className="w-20 h-20 rounded-xl object-cover border border-neutral-700/50 flex-shrink-0 bg-neutral-950" 
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black uppercase tracking-wide text-amber-500 truncate text-sm">
                        {pedido.cliente}
                      </span>
                      {!pedido.entregado && getBadgeDias(diasRestantes)}
                      {pedido.maderaLista && (
                        <span className="bg-emerald-500/10 text-emerald-500 font-bold px-1.5 py-0.2 rounded border border-emerald-500/20 text-[10px]">
                          Madera Lista
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-neutral-100 dark:text-neutral-100 text-stone-900 mt-0.5 truncate">{pedido.producto}</h3>
                    <p className={`${textMuted} font-medium`}>{pedido.medidas}</p>
                    <p className="text-amber-500/90 font-medium truncate">{pedido.madera} • {getBaseNombre(pedido.baseId)}</p>

                    {pedido.localidadEnvio && (
                      <p className={`${textMuted} flex items-center gap-1 mt-0.5 truncate text-[11px]`}>
                        <MapPin size={11} className="text-amber-500" /> {pedido.localidadEnvio}
                      </p>
                    )}
                    
                    <div className="mt-1.5 flex items-center justify-between border-t border-neutral-800/60 dark:border-neutral-800/60 border-stone-200 pt-1">
                      <span className="font-black text-emerald-500 text-sm">
                        ${restan.toLocaleString('es-AR')}
                      </span>
                      <span className={`${textMuted} font-semibold text-[11px]`}>
                        Tot: ${totalVenta.toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-between gap-3 self-stretch py-0.5">
                    <div className="flex flex-col gap-1 items-center">
                      <button 
                        onClick={() => setSelectedPedido(pedido)} 
                        className={`${textMuted} hover:text-amber-500 p-1`}>
                        <MoreHorizontal size={20} />
                      </button>
                      <button 
                        onClick={() => enviarWhatsAppDetalle(pedido)}
                        className="text-emerald-500 hover:text-emerald-400 p-1 active:scale-90 transition">
                        <MessageCircle size={20} />
                      </button>
                    </div>

                    <button 
                      onClick={() => toggleEntregado(pedido.id, pedido.entregado)} 
                      className="transition-transform active:scale-90">
                      {pedido.entregado ? (
                        <CheckCircle2 size={26} className="fill-emerald-500 text-neutral-950" />
                      ) : (
                        <Circle size={26} className={darkMode ? 'text-neutral-700' : 'text-stone-400'} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )
        ) : tab === 'stock' ? (
          <div className="space-y-2.5">
            {stockPatas.map(pata => (
              <div key={pata.id} className={`${bgCard} border p-3.5 rounded-2xl flex justify-between items-center shadow`}>
                <div className="flex-1 pr-2">
                  <h4 className="font-bold tracking-wide">{pata.nombre}</h4>
                  <span className={`text-[11px] font-bold ${pata.cantidad <= 1 ? 'text-rose-500' : 'text-amber-500/80'}`}>
                    {pata.cantidad <= 1 ? '¡Poco Stock!' : 'Estructura de hierro'}
                  </span>
                </div>
                
                <div className={`flex items-center gap-3 ${darkMode ? 'bg-neutral-950' : 'bg-stone-100'} px-2.5 py-1.5 rounded-xl border ${darkMode ? 'border-neutral-800' : 'border-stone-300'}`}>
                  <button 
                    onClick={() => handleStockChange(pata.id, -1)}
                    className={`w-8 h-8 rounded-lg ${darkMode ? 'bg-neutral-800 text-neutral-200' : 'bg-stone-200 text-stone-800'} font-black flex items-center justify-center active:scale-95`}>
                    -
                  </button>
                  <span className="font-black text-amber-500 text-base w-6 text-center">
                    {pata.cantidad}
                  </span>
                  <button 
                    onClick={() => handleStockChange(pata.id, 1)}
                    className={`w-8 h-8 rounded-lg ${darkMode ? 'bg-neutral-800 text-neutral-200' : 'bg-stone-200 text-stone-800'} font-black flex items-center justify-center active:scale-95`}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`${bgCard} border p-4 rounded-2xl space-y-3`}>
              <h3 className="font-black text-amber-500 uppercase tracking-wider">Maderas Disponibles</h3>
              <form onSubmit={handleAddMadera} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ej: Incienso 40mm"
                  value={nuevaMadera}
                  onChange={e => setNuevaMadera(e.target.value)}
                  className={`flex-1 border rounded-xl px-3 py-2 ${bgInput} outline-none`} 
                />
                <button type="submit" className="bg-amber-600 text-stone-950 px-3 py-2 rounded-xl font-bold">
                  Agregar
                </button>
              </form>

              <div className="space-y-1.5 pt-1">
                {maderas.map(m => (
                  <div key={m} className={`flex justify-between items-center ${darkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-stone-100 border-stone-200'} px-3 py-2 rounded-xl border`}>
                    <span className="font-medium">{m}</span>
                    <button onClick={() => handleDeleteMadera(m)} className="text-neutral-400 hover:text-rose-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${bgCard} border p-4 rounded-2xl space-y-3`}>
              <h3 className="font-black text-amber-500 uppercase tracking-wider">Tipos de Bases de Hierro</h3>
              <form onSubmit={handleAddPata} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ej: BASE TRAPECIO 80X70"
                  value={nuevaPataNombre}
                  onChange={e => setNuevaPataNombre(e.target.value)}
                  className={`flex-1 border rounded-xl px-3 py-2 ${bgInput} outline-none`} 
                />
                <button type="submit" className="bg-amber-600 text-stone-950 px-3 py-2 rounded-xl font-bold">
                  Agregar
                </button>
              </form>

              <div className="space-y-1.5 pt-1">
                {stockPatas.map(p => (
                  <div key={p.id} className={`flex justify-between items-center ${darkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-stone-100 border-stone-200'} px-3 py-2 rounded-xl border`}>
                    <span className="font-medium">{p.nombre}</span>
                    <button onClick={() => handleDeletePata(p.id)} className="text-neutral-400 hover:text-rose-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Detalle Pedido */}
      {selectedPedido && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className={`${darkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-stone-200 text-stone-900'} border-t sm:border w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center border-b border-neutral-700/50 pb-3">
              <div>
                <span className="font-bold text-amber-500 uppercase">{selectedPedido.cliente}</span>
                <h3 className="font-black text-xl">{selectedPedido.producto}</h3>
              </div>
              <button onClick={() => setSelectedPedido(null)} className={`p-1.5 rounded-full ${darkMode ? 'bg-neutral-800 text-neutral-300' : 'bg-stone-200 text-stone-700'}`}><X size={18} /></button>
            </div>

            <div className={`${darkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-stone-100 border-stone-200'} p-3.5 rounded-2xl border space-y-2`}>
              <div className="flex justify-between">
                <span className={textMuted}>Fecha de venta:</span>
                <span className="font-semibold">{selectedPedido.fechaVenta}</span>
              </div>
              {selectedPedido.fechaEntregaPactada && (
                <div className="flex justify-between">
                  <span className="text-amber-500 font-bold">Límite entrega:</span>
                  <span className="font-bold text-amber-500">{selectedPedido.fechaEntregaPactada}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className={textMuted}>Medidas:</span>
                <span className="font-semibold">{selectedPedido.medidas}</span>
              </div>
              <div className="flex justify-between">
                <span className={textMuted}>Madera:</span>
                <span className="font-semibold text-amber-500">{selectedPedido.madera}</span>
              </div>
              <div className="flex justify-between">
                <span className={textMuted}>Base:</span>
                <span className="font-semibold">{getBaseNombre(selectedPedido.baseId)}</span>
              </div>
              {selectedPedido.localidadEnvio && (
                <div className="flex justify-between">
                  <span className={textMuted}>Entrega:</span>
                  <span className="font-semibold">{selectedPedido.localidadEnvio} {selectedPedido.domicilioEnvio ? `(${selectedPedido.domicilioEnvio})` : ''}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className={`${darkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-stone-100 border-stone-200'} p-3 rounded-xl border`}>
                <span className={`${textMuted} block text-[10px] uppercase font-bold`}>Precio Total</span>
                <span className="font-bold">
                  ${(Number(selectedPedido.precioLista || 0) + Number(selectedPedido.cobroAdicional || 0) + Number(selectedPedido.envioCobrado || 0)).toLocaleString('es-AR')}
                </span>
              </div>
              <div className="bg-emerald-950/30 border border-emerald-800/50 p-3 rounded-xl">
                <span className="text-emerald-500 block text-[10px] uppercase font-bold">Resta Cobrar</span>
                <span className="font-black text-emerald-400 text-base">
                  ${(Number(selectedPedido.precioLista || 0) + Number(selectedPedido.cobroAdicional || 0) + Number(selectedPedido.envioCobrado || 0) - Number(selectedPedido.senia || 0)).toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => enviarWhatsAppDetalle(selectedPedido)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition">
                  <MessageCircle size={17} /> WhatsApp
                </button>
                <button 
                  onClick={() => generarPDF(selectedPedido)}
                  className={`font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition border ${
                    darkMode ? 'bg-neutral-800 text-neutral-100 border-neutral-700' : 'bg-stone-200 text-stone-900 border-stone-300'
                  }`}>
                  <Download size={17} /> Generar PDF
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenEdit(selectedPedido)}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black py-3 rounded-xl flex items-center justify-center gap-2 transition">
                  <Edit3 size={17} /> MODIFICAR
                </button>
                <button 
                  onClick={() => handleDeletePedido(selectedPedido.id)}
                  className="bg-rose-950/50 hover:bg-rose-900 border border-rose-800 text-rose-300 px-4 py-3 rounded-xl font-bold flex items-center justify-center transition">
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar */}
      {showModalForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <form onSubmit={handleSavePedido} className={`${darkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-stone-200 text-stone-900'} border-t sm:border w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-3.5 max-h-[92vh] overflow-y-auto`}>
            <div className="flex justify-between items-center border-b border-neutral-700/50 pb-3">
              <h3 className="font-black text-amber-500 uppercase">
                {editingId ? 'Modificar Pedido' : 'Crear Nuevo Pedido'}
              </h3>
              <button type="button" onClick={() => setShowModalForm(false)} className="p-1"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`font-bold ${textMuted} block mb-1`}>Fecha Venta</label>
                  <input 
                    type="date" 
                    required
                    value={formData.fechaVenta} 
                    onChange={e => setFormData({ ...formData, fechaVenta: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 ${bgInput} outline-none`} 
                  />
                </div>
                <div>
                  <label className="font-bold text-amber-500 block mb-1">Pactado Entrega</label>
                  <input 
                    type="date" 
                    value={formData.fechaEntregaPactada} 
                    onChange={e => setFormData({ ...formData, fechaEntregaPactada: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 ${bgInput} text-amber-500 font-bold outline-none`} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`font-bold ${textMuted} block mb-1`}>Cliente</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Nombre"
                    value={formData.cliente} 
                    onChange={e => setFormData({ ...formData, cliente: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 ${bgInput} outline-none`} 
                  />
                </div>
                <div>
                  <label className="font-bold text-emerald-500 block mb-1">Teléfono (WhatsApp)</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 1122334455"
                    value={formData.telefono} 
                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 ${bgInput} outline-none`} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`font-bold ${textMuted} block mb-1`}>Producto</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej: Mesa Comedor"
                    value={formData.producto} 
                    onChange={e => setFormData({ ...formData, producto: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 ${bgInput} outline-none`} 
                  />
                </div>
                <div>
                  <label className={`font-bold ${textMuted} block mb-1`}>Medidas</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 2.00 x 1.00 m"
                    value={formData.medidas} 
                    onChange={e => setFormData({ ...formData, medidas: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 ${bgInput} outline-none`} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-amber-500 block mb-1">Madera</label>
                  <select 
                    value={formData.madera} 
                    onChange={e => setFormData({ ...formData, madera: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 ${bgInput} text-amber-500 font-bold outline-none`}>
                    {maderas.map((m) => (
                      <option key={m} value={m} className={darkMode ? 'bg-neutral-900' : 'bg-white'}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-amber-500 block mb-1">Base de Hierro</label>
                  <select 
                    value={formData.baseId} 
                    onChange={e => setFormData({ ...formData, baseId: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 ${bgInput} outline-none`}>
                    {stockPatas.map(b => (
                      <option key={b.id} value={b.id} className={darkMode ? 'bg-neutral-900' : 'bg-white'}>
                        {b.nombre} ({b.cantidad} disp.)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-neutral-700/50 pt-2">
                <div>
                  <label className={`font-bold ${textMuted} block mb-1`}>Localidad / Zona</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Avellaneda / CABA"
                    value={formData.localidadEnvio} 
                    onChange={e => setFormData({ ...formData, localidadEnvio: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 ${bgInput} outline-none`} 
                  />
                </div>
                <div>
                  <label className={`font-bold ${textMuted} block mb-1`}>Domicilio</label>
                  <input 
                    type="text" 
                    placeholder="Calle, Altura"
                    value={formData.domicilioEnvio} 
                    onChange={e => setFormData({ ...formData, domicilioEnvio: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 ${bgInput} outline-none`} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`font-bold ${textMuted} block mb-1`}>Precio Lista ($)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={formData.precioLista} 
                    onChange={e => setFormData({ ...formData, precioLista: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 ${bgInput} outline-none`} 
                  />
                </div>
                <div>
                  <label className="font-bold text-amber-500 block mb-1">Seña Pagada ($)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={formData.senia} 
                    onChange={e => setFormData({ ...formData, senia: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 ${bgInput} text-amber-500 font-bold outline-none`} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`font-bold ${textMuted} block mb-1`}>Adicional ($)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={formData.cobroAdicional} 
                    onChange={e => setFormData({ ...formData, cobroAdicional: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 ${bgInput} outline-none`} 
                  />
                </div>
                <div>
                  <label className={`font-bold ${textMuted} block mb-1`}>Envío Cobrado ($)</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    value={formData.envioCobrado} 
                    onChange={e => setFormData({ ...formData, envioCobrado: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 ${bgInput} outline-none`} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 items-center">
                <label className={`flex items-center gap-2 ${bgInput} border p-2 rounded-xl cursor-pointer`}>
                  <input 
                    type="checkbox" 
                    checked={formData.maderaLista} 
                    onChange={e => setFormData({ ...formData, maderaLista: e.target.checked })}
                    className="w-4 h-4 accent-amber-600 rounded" 
                  />
                  <span className="font-bold text-xs">Madera lista</span>
                </label>

                <label className={`flex items-center justify-center ${bgInput} border py-2 rounded-xl font-semibold cursor-pointer text-xs`}>
                  Subir foto
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-amber-600 hover:bg-amber-500 text-stone-950 font-black py-3 rounded-xl uppercase tracking-wider shadow transition mt-2">
              {editingId ? 'Guardar Cambios' : 'Crear Pedido'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
