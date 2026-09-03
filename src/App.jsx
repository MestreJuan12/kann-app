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
  PackageCheck,
  LayoutDashboard,
  Boxes,
  Layers,
  Search,
  Check
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabaseClient';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';

const IMAGEN_DEFAULT = 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?auto=format&fit=crop&w=400&q=80';

export default function App() {
  const [tab, setTab] = useState('activos');
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [showModalForm, setShowModalForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, pedido: null });
  const [busqueda, setBusqueda] = useState('');

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
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('app_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('app_theme', 'light');
    }
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
      console.error('Error al sincronizar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Suscripción Realtime a cambios en Postgres
    const channel = supabase
      .channel("taller-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => {
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_patas" },
        () => {
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "maderas" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        <Badge variant="destructive" className="gap-1 font-mono text-[10px] whitespace-nowrap">
          <AlertTriangle size={11} /> Atrasado ({Math.abs(dias)}d)
        </Badge>
      );
    }
    if (dias === 0) {
      return (
        <Badge variant="default" className="text-[10px] whitespace-nowrap">
          Entrega Hoy
        </Badge>
      );
    }
    if (dias <= 3) {
      return (
        <Badge variant="secondary" className="gap-1 border border-border text-[10px] whitespace-nowrap">
          <Clock size={11} /> {dias}d rest.
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
        <Clock size={11} /> {dias}d
      </Badge>
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
      console.error('Error al guardar pedido:', err);
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
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('ORDEN DE TRABAJO', 15, 22);
      
      doc.setFontSize(9);
      doc.setTextColor(161, 161, 170);
      doc.text(`ID #${(pedido.id || '0000').slice(-5)}`, 150, 22);

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(10);
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
      (pedido.fechaEntregaPactada ? `📅 *Entrega pactada:* ${pedido.fechaEntregaPactada}\n` : '') +
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
      .filter(p => {
        if (!busqueda.trim()) return true;
        const q = busqueda.toLowerCase();
        return (
          p.cliente?.toLowerCase().includes(q) ||
          p.producto?.toLowerCase().includes(q) ||
          p.localidadEnvio?.toLowerCase().includes(q)
        );
      })
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
  }, [pedidos, tab, filtroMadera, ordenFecha, busqueda]);

  const metricas = useMemo(() => {
    const act = pedidos.filter(p => !p.entregado);
    const fin = pedidos.filter(p => p.entregado);

    const calcTotales = (lista) => lista.reduce((acc, p) => {
      const total = Number(p.precioLista || 0) + Number(p.cobroAdicional || 0) + Number(p.envioCobrado || 0);
      const senia = Number(p.senia || 0);
      return { bruto: acc.bruto + total, resta: acc.resta + (total - senia) };
    }, { bruto: 0, resta: 0 });

    const activosMet = calcTotales(act);
    const finalizadosMet = calcTotales(fin);

    return {
      activosCount: act.length,
      finalizadosCount: fin.length,
      activosMetricas: activosMet,
      finalizadosMetricas: finalizadosMet,
      totalHistorico: activosMet.bruto + finalizadosMet.bruto
    };
  }, [pedidos]);

  const rootScale = 
    fontSize === '4x' ? 'text-lg' :
    fontSize === '3x' ? 'text-base' :
    fontSize === '2x' ? 'text-sm' : 'text-xs';

  return (
    <div className={`min-h-screen bg-background text-foreground flex font-sans transition-colors duration-150 ${rootScale}`}>
      
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4 justify-between select-none">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-2">
             <img src="/logo.png" alt="Logo KANN" className="w-8 h-8 rounded-lg object-contain bg-background border border-border p-0.5 shadow-sm" onError={(e) => { e.target.style.display="none" }} /> <div className="hidden">
              ✦
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight block">TALLER KANN</span>
              <span className="text-[11px] text-muted-foreground block font-mono">Control de Producción</span>
            </div>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setTab('activos')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition ${tab === 'activos' ? 'bg-secondary text-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <span className="flex items-center gap-2.5">
                <LayoutDashboard size={16} />
                <span>En Producción</span>
              </span>
              <Badge variant="secondary" className="font-mono text-[10px]">{metricas.activosCount}</Badge>
            </button>

            <button 
              onClick={() => setTab('finalizados')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition ${tab === 'finalizados' ? 'bg-secondary text-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <span className="flex items-center gap-2.5">
                <CheckCircle2 size={16} />
                <span>Finalizados</span>
              </span>
              <Badge variant="outline" className="font-mono text-[10px]">{metricas.finalizadosCount}</Badge>
            </button>

            <button 
              onClick={() => setTab('stock')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition ${tab === 'stock' ? 'bg-secondary text-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <span className="flex items-center gap-2.5">
                <Boxes size={16} />
                <span>Stock Bases</span>
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">{stockPatas.length} tipos</span>
            </button>

            <button 
              onClick={() => setTab('ajustes')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition ${tab === 'ajustes' ? 'bg-secondary text-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <span className="flex items-center gap-2.5">
                <Settings size={16} />
                <span>Configuración</span>
              </span>
            </button>
          </nav>
        </div>

        <div className="space-y-3 pt-4 border-t border-border">
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground block tracking-wider">Histórico Total</span>
            <span className="text-sm font-semibold tracking-tight font-mono block mt-0.5">
              ${metricas.totalHistorico.toLocaleString('es-AR')}
            </span>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDarkMode(!darkMode)}>
                {darkMode ? <Sun size={15} /> : <Moon size={15} />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchData} title="Sincronizar">
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={toggleFontSize} className="h-7 px-2 font-mono text-[11px]">
              <ZoomIn size={12} className="mr-1" />
              {fontSize}
            </Button>
          </div>
        </div>
      </aside>

      {/* Contenedor Principal (Desktop + Mobile) */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header Superior */}
        <header className="border-b border-border bg-background/80 backdrop-blur-md px-4 py-3 sticky top-0 z-20 flex justify-between items-center gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Buscar cliente, modelo o localidad..." 
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="pl-8 h-8 text-xs bg-muted/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="md:hidden flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDarkMode(!darkMode)}>
                {darkMode ? <Sun size={15} /> : <Moon size={15} />}
              </Button>
              <Button variant="outline" size="sm" onClick={toggleFontSize} className="h-8 px-2 font-mono text-xs">
                {fontSize}
              </Button>
            </div>

            <Button 
              size="sm" 
              onClick={handleOpenCreate} 
              className="h-8 px-3.5 gap-1.5 font-medium shadow-sm">
              <Plus size={15} />
              <span>Nuevo Pedido</span>
            </Button>
          </div>
        </header>

        {/* Métricas estilo Dashboard */}
        <div className="p-4 md:p-6 border-b border-border bg-muted/10 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              En Producción
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg md:text-xl font-semibold tracking-tight font-mono">
                ${metricas.activosMetricas.bruto.toLocaleString('es-AR')}
              </span>
              <Badge variant="secondary" className="font-mono text-[10px]">{metricas.activosCount} órdenes</Badge>
            </div>
          </Card>

          <Card className="p-3.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Saldo a Cobrar
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg md:text-xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                ${metricas.activosMetricas.resta.toLocaleString('es-AR')}
              </span>
              <span className="text-[11px] text-muted-foreground">Pendiente</span>
            </div>
          </Card>

          <Card className="p-3.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Cobrado Finalizados
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg md:text-xl font-semibold tracking-tight font-mono">
                ${metricas.finalizadosMetricas.bruto.toLocaleString('es-AR')}
              </span>
              <Badge variant="outline" className="font-mono text-[10px]">{metricas.finalizadosCount} entregados</Badge>
            </div>
          </Card>

          <Card className="p-3.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
              Estructuras en Taller
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg md:text-xl font-semibold tracking-tight font-mono">
                {stockPatas.reduce((acc, p) => acc + p.cantidad, 0)}
              </span>
              <span className="text-[11px] text-muted-foreground">Bases listas</span>
            </div>
          </Card>
        </div>

        {/* Barra de Filtros y Vistas */}
        <div className="px-4 md:px-6 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-background">
          <div className="flex items-center gap-2">
            {/* Tabs en Mobile */}
            <div className="md:hidden flex bg-muted p-1 rounded-md text-xs font-medium border border-border">
              <button 
                onClick={() => setTab('activos')} 
                className={`px-2.5 py-1 rounded transition ${tab === 'activos' ? 'bg-background text-foreground shadow-sm font-semibold' : 'text-muted-foreground'}`}>
                Activos ({metricas.activosCount})
              </button>
              <button 
                onClick={() => setTab('finalizados')} 
                className={`px-2.5 py-1 rounded transition ${tab === 'finalizados' ? 'bg-background text-foreground shadow-sm font-semibold' : 'text-muted-foreground'}`}>
                Finalizados
              </button>
              <button 
                onClick={() => setTab('stock')} 
                className={`px-2.5 py-1 rounded transition ${tab === 'stock' ? 'bg-background text-foreground shadow-sm font-semibold' : 'text-muted-foreground'}`}>
                Bases
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select 
                value={filtroMadera} 
                onChange={e => setFiltroMadera(e.target.value)}
                className="h-8 border border-input rounded-md px-2.5 bg-background text-xs font-medium outline-none cursor-pointer">
                <option value="TODAS">Todas las maderas</option>
                {maderas.map(m => <option key={m} value={m}>{m}</option>)}
              </select>

              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setOrdenFecha(ordenFecha === 'entrega' ? 'desc' : ordenFecha === 'desc' ? 'asc' : 'entrega')}
                className="h-8 gap-1 text-xs">
                <ArrowUpDown size={12} className="text-muted-foreground" />
                <span>{ordenFecha === 'entrega' ? 'Por Entrega' : ordenFecha === 'desc' ? 'Recientes' : 'Antiguos'}</span>
              </Button>
            </div>
          </div>

          <span className="text-xs text-muted-foreground font-mono">
            {pedidosFiltrados.length} registros
          </span>
        </div>

        {/* Vista Principal */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {tab === 'activos' || tab === 'finalizados' ? (
            pedidosFiltrados.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground text-xs">
                {loading ? 'Sincronizando base de datos...' : 'No se encontraron registros.'}
              </div>
            ) : (
              <>
                {/* Tabla Desktop */}
                <div className="hidden md:block rounded-xl border border-border overflow-hidden bg-card shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
                        <th className="p-3.5 pl-4">Estado</th>
                        <th className="p-3.5">Cliente</th>
                        <th className="p-3.5">Producto & Medidas</th>
                        <th className="p-3.5">Madera & Base</th>
                        <th className="p-3.5">Plazo Entrega</th>
                        <th className="p-3.5">Destino</th>
                        <th className="p-3.5 text-right">Saldo Pendiente</th>
                        <th className="p-3.5 text-right">Total</th>
                        <th className="p-3.5 pr-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pedidosFiltrados.map((pedido) => {
                        const totalVenta = Number(pedido.precioLista || 0) + Number(pedido.cobroAdicional || 0) + Number(pedido.envioCobrado || 0);
                        const restan = totalVenta - Number(pedido.senia || 0);
                        const diasRestantes = calcularDiasRestantes(pedido.fechaEntregaPactada);

                        return (
                          <tr key={pedido.id} className="hover:bg-muted/20 transition-colors group">
                            <td className="p-3.5 pl-4">
                              <button 
                                onClick={() => setConfirmModal({ show: true, pedido })} 
                                className="transition-transform active:scale-90 flex items-center gap-2">
                                {pedido.entregado ? (
                                  <CheckCircle2 size={20} className="text-foreground" />
                                ) : (
                                  <Circle size={20} className="text-muted-foreground/60 hover:text-foreground" />
                                )}
                              </button>
                            </td>
                            <td className="p-3.5 font-semibold text-foreground">
                              {pedido.cliente}
                            </td>
                            <td className="p-3.5">
                              <div className="font-medium text-foreground/90">{pedido.producto}</div>
                              <div className="text-[11px] text-muted-foreground">{pedido.medidas}</div>
                            </td>
                            <td className="p-3.5">
                              <div className="text-foreground/90">{pedido.madera}</div>
                              <div className="text-[11px] text-muted-foreground">{getBaseNombre(pedido.baseId)}</div>
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-1.5">
                                {!pedido.entregado ? getBadgeDias(diasRestantes) : <Badge variant="outline">Entregado</Badge>}
                              </div>
                              {pedido.fechaEntregaPactada && (
                                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{pedido.fechaEntregaPactada}</div>
                              )}
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <MapPin size={11} />
                                <span>{pedido.localidadEnvio || 'Taller'}</span>
                              </div>
                            </td>
                            <td className="p-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                              ${restan.toLocaleString('es-AR')}
                            </td>
                            <td className="p-3.5 text-right font-mono text-muted-foreground">
                              ${totalVenta.toLocaleString('es-AR')}
                            </td>
                            <td className="p-3.5 pr-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10"
                                  onClick={() => enviarWhatsAppDetalle(pedido)}
                                  title="WhatsApp">
                                  <MessageCircle size={15} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7"
                                  onClick={() => setSelectedPedido(pedido)}
                                  title="Ver detalle">
                                  <MoreHorizontal size={15} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tarjetas Mobile */}
                <div className="md:hidden space-y-2.5">
                  {pedidosFiltrados.map((pedido) => {
                    const totalVenta = Number(pedido.precioLista || 0) + Number(pedido.cobroAdicional || 0) + Number(pedido.envioCobrado || 0);
                    const restan = totalVenta - Number(pedido.senia || 0);
                    const diasRestantes = calcularDiasRestantes(pedido.fechaEntregaPactada);

                    return (
                      <Card key={pedido.id} className="p-3.5 flex gap-3.5 items-center">
                        <img 
                          src={pedido.foto || IMAGEN_DEFAULT} 
                          alt={pedido.producto} 
                          className="w-16 h-16 rounded-lg object-cover border border-border flex-shrink-0 bg-muted" 
                        />

                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs tracking-tight truncate">
                              {pedido.cliente}
                            </span>
                            {!pedido.entregado && getBadgeDias(diasRestantes)}
                            {pedido.maderaLista && (
                              <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                                Madera lista
                              </Badge>
                            )}
                          </div>

                          <h4 className="font-medium text-xs truncate">{pedido.producto}</h4>
                          <p className="text-[11px] text-muted-foreground truncate">{pedido.medidas} • {pedido.madera}</p>

                          {pedido.localidadEnvio && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                              <MapPin size={11} className="flex-shrink-0" /> {pedido.localidadEnvio}
                            </p>
                          )}

                          <div className="pt-1.5 flex items-center justify-between border-t border-border text-xs">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                              ${restan.toLocaleString('es-AR')}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Tot: ${totalVenta.toLocaleString('es-AR')}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-between gap-3 self-stretch py-0.5">
                          <div className="flex flex-col gap-1 items-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => setSelectedPedido(pedido)}>
                              <MoreHorizontal size={15} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10"
                              onClick={() => enviarWhatsAppDetalle(pedido)}>
                              <MessageCircle size={15} />
                            </Button>
                          </div>

                          <button 
                            onClick={() => setConfirmModal({ show: true, pedido })} 
                            className="text-muted-foreground hover:text-foreground transition-transform active:scale-95">
                            {pedido.entregado ? (
                              <CheckCircle2 size={22} className="text-foreground" />
                            ) : (
                              <Circle size={22} className="text-muted-foreground/60 hover:text-foreground" />
                            )}
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )
          ) : tab === 'stock' ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stockPatas.map(pata => (
                <Card key={pata.id} className="p-4 flex justify-between items-center">
                  <div className="flex-1 pr-2">
                    <h4 className="font-semibold text-xs">{pata.nombre}</h4>
                    <span className={`text-[11px] ${pata.cantidad <= 1 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {pata.cantidad <= 1 ? 'Stock crítico' : 'Estructura metálica'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-muted p-1 rounded-md border border-border">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0"
                      onClick={() => handleStockChange(pata.id, -1)}>
                      -
                    </Button>
                    <span className="font-semibold text-xs w-6 text-center font-mono">
                      {pata.cantidad}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0"
                      onClick={() => handleStockChange(pata.id, 1)}>
                      +
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Maderas Disponibles</h3>
                <form onSubmit={handleAddMadera} className="flex gap-2">
                  <Input 
                    type="text" 
                    placeholder="Ej: Incienso 40mm"
                    value={nuevaMadera}
                    onChange={e => setNuevaMadera(e.target.value)}
                    className="h-9 text-xs" 
                  />
                  <Button type="submit" size="sm" className="h-9">Agregar</Button>
                </form>

                <div className="space-y-1.5 pt-1">
                  {maderas.map(m => (
                    <div key={m} className="flex justify-between items-center bg-muted/40 px-3 py-2 rounded-md border border-border text-xs">
                      <span>{m}</span>
                      <button onClick={() => handleDeleteMadera(m)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Bases de Hierro</h3>
                <form onSubmit={handleAddPata} className="flex gap-2">
                  <Input 
                    type="text" 
                    placeholder="Ej: BASE TRAPECIO 80X70"
                    value={nuevaPataNombre}
                    onChange={e => setNuevaPataNombre(e.target.value)}
                    className="h-9 text-xs" 
                  />
                  <Button type="submit" size="sm" className="h-9">Agregar</Button>
                </form>

                <div className="space-y-1.5 pt-1">
                  {stockPatas.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-muted/40 px-3 py-2 rounded-md border border-border text-xs">
                      <span>{p.nombre}</span>
                      <button onClick={() => handleDeletePata(p.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Modal Confirmación */}
      {confirmModal.show && confirmModal.pedido && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm p-5 space-y-4 shadow-xl">
            <div>
              <h3 className="font-semibold text-sm">
                {confirmModal.pedido.entregado ? '¿Reactivar pedido?' : '¿Finalizar pedido?'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {confirmModal.pedido.entregado
                  ? 'El pedido pasará a la lista de activos.'
                  : 'El pedido se marcará como entregado y pasará a finalizados.'}
              </p>
            </div>

            <div className="bg-muted p-3 rounded-md border border-border text-xs space-y-1 font-mono">
              <p><span className="text-muted-foreground">Cliente:</span> {confirmModal.pedido.cliente}</p>
              <p><span className="text-muted-foreground">Modelo:</span> {confirmModal.pedido.producto}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setConfirmModal({ show: false, pedido: null })}>
                Cancelar
              </Button>
              <Button 
                size="sm"
                onClick={executeToggleEntregado}>
                Confirmar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Detalle */}
      {selectedPedido && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md rounded-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <Badge variant="outline" className="mb-1">{selectedPedido.cliente}</Badge>
                <h3 className="font-semibold text-base">{selectedPedido.producto}</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedPedido(null)}>
                <X size={16} />
              </Button>
            </div>

            <div className="bg-muted/40 p-3.5 rounded-lg border border-border space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Venta:</span><span>{selectedPedido.fechaVenta}</span></div>
              {selectedPedido.fechaEntregaPactada && (
                <div className="flex justify-between"><span className="text-muted-foreground font-semibold">Entrega límite:</span><span className="font-semibold">{selectedPedido.fechaEntregaPactada}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Medidas:</span><span>{selectedPedido.medidas}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Madera:</span><span>{selectedPedido.madera}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Base:</span><span>{getBaseNombre(selectedPedido.baseId)}</span></div>
              {selectedPedido.localidadEnvio && (
                <div className="flex justify-between"><span className="text-muted-foreground">Destino:</span><span>{selectedPedido.localidadEnvio}</span></div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="border border-border p-3 rounded-md bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-medium block">Total General</span>
                <span className="font-semibold text-sm block mt-0.5 font-mono">
                  ${(Number(selectedPedido.precioLista || 0) + Number(selectedPedido.cobroAdicional || 0) + Number(selectedPedido.envioCobrado || 0)).toLocaleString('es-AR')}
                </span>
              </div>
              <div className="border border-emerald-500/30 bg-emerald-500/5 p-3 rounded-md">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-medium block">Saldo Pendiente</span>
                <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 block mt-0.5 font-mono">
                  ${(Number(selectedPedido.precioLista || 0) + Number(selectedPedido.cobroAdicional || 0) + Number(selectedPedido.envioCobrado || 0) - Number(selectedPedido.senia || 0)).toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => enviarWhatsAppDetalle(selectedPedido)}
                  className="gap-1.5 h-9">
                  <MessageCircle size={15} /> WhatsApp
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => generarPDF(selectedPedido)}
                  className="gap-1.5 h-9">
                  <Download size={15} /> PDF
                </Button>
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm"
                  onClick={() => handleOpenEdit(selectedPedido)}
                  className="flex-1 gap-1.5 h-9">
                  <Edit3 size={15} /> Modificar
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDeletePedido(selectedPedido.id)}
                  className="h-9 px-3">
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Formulario */}
      {showModalForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md rounded-xl p-5 space-y-3.5 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-semibold text-sm">
                {editingId ? 'Editar Pedido' : 'Nuevo Pedido'}
              </h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowModalForm(false)}>
                <X size={15} />
              </Button>
            </div>

            <form onSubmit={handleSavePedido} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted-foreground block mb-1">Fecha Venta</label>
                  <Input 
                    type="date" 
                    required
                    value={formData.fechaVenta} 
                    onChange={e => setFormData({ ...formData, fechaVenta: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Pactado Entrega</label>
                  <Input 
                    type="date" 
                    value={formData.fechaEntregaPactada} 
                    onChange={e => setFormData({ ...formData, fechaEntregaPactada: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted-foreground block mb-1">Cliente</label>
                  <Input 
                    type="text" 
                    required
                    placeholder="Nombre"
                    value={formData.cliente} 
                    onChange={e => setFormData({ ...formData, cliente: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Teléfono</label>
                  <Input 
                    type="text" 
                    placeholder="WhatsApp"
                    value={formData.telefono} 
                    onChange={e => setFormData({ ...formData, telefono: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted-foreground block mb-1">Producto</label>
                  <Input 
                    type="text" 
                    required
                    placeholder="Ej: Mesa Comedor"
                    value={formData.producto} 
                    onChange={e => setFormData({ ...formData, producto: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Medidas</label>
                  <Input 
                    type="text" 
                    placeholder="Ej: 2.00 x 1.00 m"
                    value={formData.medidas} 
                    onChange={e => setFormData({ ...formData, medidas: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted-foreground block mb-1">Madera</label>
                  <select 
                    value={formData.madera} 
                    onChange={e => setFormData({ ...formData, madera: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm font-medium">
                    {maderas.map((m) => (
                      <option key={m} value={m} className={darkMode ? 'bg-zinc-900' : 'bg-white'}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Base</label>
                  <select 
                    value={formData.baseId} 
                    onChange={e => setFormData({ ...formData, baseId: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm font-medium">
                    {stockPatas.map(b => (
                      <option key={b.id} value={b.id} className={darkMode ? 'bg-zinc-900' : 'bg-white'}>
                        {b.nombre} ({b.cantidad} disp.)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-border pt-2">
                <div>
                  <label className="text-muted-foreground block mb-1">Localidad</label>
                  <Input 
                    type="text" 
                    placeholder="Ej: Avellaneda"
                    value={formData.localidadEnvio} 
                    onChange={e => setFormData({ ...formData, localidadEnvio: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Dirección</label>
                  <Input 
                    type="text" 
                    placeholder="Calle, Altura"
                    value={formData.domicilioEnvio} 
                    onChange={e => setFormData({ ...formData, domicilioEnvio: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted-foreground block mb-1">Precio Base ($)</label>
                  <Input 
                    type="number" 
                    placeholder="0"
                    value={formData.precioLista} 
                    onChange={e => setFormData({ ...formData, precioLista: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Seña Pagada ($)</label>
                  <Input 
                    type="number" 
                    placeholder="0"
                    value={formData.senia} 
                    onChange={e => setFormData({ ...formData, senia: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted-foreground block mb-1">Adicional ($)</label>
                  <Input 
                    type="number" 
                    placeholder="0"
                    value={formData.cobroAdicional} 
                    onChange={e => setFormData({ ...formData, cobroAdicional: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Envío ($)</label>
                  <Input 
                    type="number" 
                    placeholder="0"
                    value={formData.envioCobrado} 
                    onChange={e => setFormData({ ...formData, envioCobrado: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 items-center">
                <label className="flex items-center gap-2 border border-input rounded-md p-2 bg-background cursor-pointer text-xs">
                  <input 
                    type="checkbox" 
                    checked={formData.maderaLista} 
                    onChange={e => setFormData({ ...formData, maderaLista: e.target.checked })}
                    className="rounded border-input text-primary" 
                  />
                  <span>Madera lista</span>
                </label>

                <label className="flex items-center justify-center border border-input rounded-md py-2 bg-background text-xs cursor-pointer hover:bg-muted/40 font-medium">
                  Subir fotografía
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-10 gap-2 font-semibold text-xs mt-2">
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>{editingId ? 'Guardar Cambios' : 'Registrar Pedido'}</span>
                )}
              </Button>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}
