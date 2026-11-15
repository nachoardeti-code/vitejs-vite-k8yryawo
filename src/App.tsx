import React, { useState, useMemo } from 'react';
import {
  Users,
  DollarSign,
  Utensils,
  Share2,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Check,
  AlertTriangle,
  Copy,
  Receipt,
  Scale,
  Info,
  Wallet,
  Calculator
} from 'lucide-react';

// Datos iniciales basados en la juntada de la conversación
const INITIAL_PARTICIPANTS = [
  {
    id: '1',
    name: 'May',
    paid: 10000,
    paidDesc: 'Cocas',
    consumed: 7000,
    consumedDesc: 'Choripán'
  },
  {
    id: '2',
    name: 'Nacho G',
    paid: 6000,
    paidDesc: 'Hielo',
    consumed: 7000,
    consumedDesc: 'Choripán'
  },
  {
    id: '3',
    name: 'Ara',
    paid: 0,
    paidDesc: '',
    consumed: 11000,
    consumedDesc: 'Bondiola'
  },
  {
    id: '4',
    name: 'Guido',
    paid: 0,
    paidDesc: '',
    consumed: 11000,
    consumedDesc: 'Bondiola'
  },
  {
    id: '5',
    name: 'Nacho A',
    paid: 62000,
    paidDesc: 'Comida de todos y papas',
    consumed: 14000,
    consumedDesc: 'Churrasquito'
  }
];

// Formateador de moneda estilo argentino ($12.600)
const formatCurrency = (amount) => {
  const rounded = Math.round(amount);
  const isNegative = rounded < 0;
  const absVal = Math.abs(rounded).toLocaleString('es-AR');
  return `${isNegative ? '-' : ''}$${absVal}`;
};

export default function App() {
  // 'detailed' = Consumo individual + compartidos | 'equal' = Todos consumimos lo mismo
  const [mode, setMode] = useState('detailed');
  const [participants, setParticipants] = useState(INITIAL_PARTICIPANTS);
  const [eventTitle, setEventTitle] = useState('Juntada / Comida');
  const [copied, setCopied] = useState(false);

  // Estado para agregar nuevo participante rápido
  const [newName, setNewName] = useState('');
  const [newPaid, setNewPaid] = useState('');
  const [newPaidDesc, setNewPaidDesc] = useState('');
  const [newConsumed, setNewConsumed] = useState('');
  const [newConsumedDesc, setNewConsumedDesc] = useState('');

  // Funciones de gestión de participantes
  const handleAddParticipant = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newPerson = {
      id: Date.now().toString(),
      name: newName.trim(),
      paid: parseFloat(newPaid) || 0,
      paidDesc: newPaidDesc.trim(),
      consumed: parseFloat(newConsumed) || 0,
      consumedDesc: newConsumedDesc.trim()
    };

    setParticipants([...participants, newPerson]);
    setNewName('');
    setNewPaid('');
    setNewPaidDesc('');
    setNewConsumed('');
    setNewConsumedDesc('');
  };

  const handleUpdateParticipant = (id, field, value) => {
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (field === 'paid' || field === 'consumed') {
          const num = value === '' ? 0 : parseFloat(value);
          return { ...p, [field]: isNaN(num) ? 0 : Math.max(0, num) };
        }
        return { ...p, [field]: value };
      })
    );
  };

  const handleRemoveParticipant = (id) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const handleLoadExample = () => {
    setParticipants(INITIAL_PARTICIPANTS);
    setMode('detailed');
    setEventTitle('Juntada (Choripanes, Bondiolas y Papas)');
  };

  const handleClearAll = () => {
    setParticipants([
      { id: '1', name: 'Persona 1', paid: 0, paidDesc: '', consumed: 0, consumedDesc: '' },
      { id: '2', name: 'Persona 2', paid: 0, paidDesc: '', consumed: 0, consumedDesc: '' }
    ]);
    setEventTitle('Nueva Cuenta');
  };

  // Cálculos matemáticos y algoritmo de liquidación de deudas
  const calculations = useMemo(() => {
    const count = participants.length;
    if (count === 0) {
      return {
        totalPaid: 0,
        totalIndividualConsumed: 0,
        sharedPool: 0,
        sharedPerPerson: 0,
        hasDeficitError: false,
        deficitAmount: 0,
        breakdown: [],
        transfers: []
      };
    }

    const totalPaid = participants.reduce((acc, p) => acc + (Number(p.paid) || 0), 0);
    const totalIndividualConsumed =
      mode === 'equal'
        ? 0
        : participants.reduce((acc, p) => acc + (Number(p.consumed) || 0), 0);

    // En modo detallado, lo que sobra entre lo pagado y los platos individuales es el pozo compartido
    const rawSharedPool = totalPaid - totalIndividualConsumed;
    const hasDeficitError = mode === 'detailed' && rawSharedPool < 0;
    const deficitAmount = hasDeficitError ? Math.abs(rawSharedPool) : 0;

    // Si hay déficit (pusieron menos plata de lo que suman los platos), repartimos el desfase o calculamos igual para mostrar la alerta
    const sharedPool = mode === 'equal' ? totalPaid : rawSharedPool;
    const sharedPerPerson = sharedPool / count;

    // Desglose por participante
    const breakdown = participants.map((p) => {
      const paid = Number(p.paid) || 0;
      const individual = mode === 'equal' ? 0 : Number(p.consumed) || 0;
      const finalCost = individual + sharedPerPerson;
      // balance > 0: puso de más (deben recibir plata)
      // balance < 0: puso de menos (debe pagar plata)
      const balance = paid - finalCost;

      return {
        ...p,
        paid,
        individual,
        sharedQuota: sharedPerPerson,
        finalCost,
        balance
      };
    });

    // Algoritmo Greedy para simplificar transferencias
    const debtors = breakdown
      .filter((p) => p.balance < -0.5)
      .map((p) => ({ id: p.id, name: p.name, amount: Math.abs(p.balance) }))
      .sort((a, b) => b.amount - a.amount);

    const creditors = breakdown
      .filter((p) => p.balance > 0.5)
      .map((p) => ({ id: p.id, name: p.name, amount: p.balance }))
      .sort((a, b) => b.amount - a.amount);

    const transfers = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);

      if (amount > 0.5) {
        transfers.push({
          from: debtor.name || 'Sin nombre',
          to: creditor.name || 'Sin nombre',
          amount: Math.round(amount)
        });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.5) i++;
      if (creditor.amount < 0.5) j++;
    }

    return {
      totalPaid,
      totalIndividualConsumed,
      sharedPool,
      sharedPerPerson,
      hasDeficitError,
      deficitAmount,
      breakdown,
      transfers
    };
  }, [participants, mode]);

  // Generar texto para copiar a WhatsApp
  const generateWhatsAppText = () => {
    const lines = [];
    lines.push(`🧾 *RESUMEN DE GASTOS: ${eventTitle.toUpperCase()}*`);
    lines.push(`💰 *Gasto Total del Grupo:* ${formatCurrency(calculations.totalPaid)}`);

    if (mode === 'equal') {
      lines.push(`⚖️ *Modalidad:* Todos consumimos lo mismo (${formatCurrency(calculations.sharedPerPerson)} c/u)`);
    } else {
      lines.push(`🍽️ *Platos individuales:* ${formatCurrency(calculations.totalIndividualConsumed)}`);
      lines.push(`🍟 *Pozo compartido (bebidas, papas, hielo, etc.):* ${formatCurrency(calculations.sharedPool)} (${formatCurrency(calculations.sharedPerPerson)} c/u)`);
    }

    lines.push('');
    lines.push('📊 *Detalle por persona:*');
    calculations.breakdown.forEach((p) => {
      const name = p.name || 'Participante';
      if (mode === 'detailed') {
        lines.push(
          `• *${name}:* Consumió ${formatCurrency(p.finalCost)} (${formatCurrency(p.individual)} indiv. + ${formatCurrency(p.sharedQuota)} comp.) | Puso ${formatCurrency(p.paid)}`
        );
      } else {
        lines.push(
          `• *${name}:* Le toca ${formatCurrency(p.finalCost)} | Puso ${formatCurrency(p.paid)}`
        );
      }
    });

    lines.push('');
    lines.push('💸 *¿Quién le transfiere a quién?*');
    if (calculations.transfers.length === 0) {
      lines.push('✅ ¡Están todos a mano! Nadie debe nada.');
    } else {
      calculations.transfers.forEach((t) => {
        lines.push(`👉 *${t.from}* le pasa a *${t.to}*: *${formatCurrency(t.amount)}*`);
      });
    }

    return lines.join('\n');
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Header Principal */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-950/50">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Dividir Gastos</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                  Skill App
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Calculá cuánto puso cada uno, qué consumió y quién le transfiere a quién
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLoadExample}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition cursor-pointer"
              title="Cargar el caso de May, Nacho G, Ara, Guido y Nacho A"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Cargar ejemplo juntada
            </button>
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800 text-slate-300 border border-slate-800 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reiniciar cuenta
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-6">
        {/* Selector de Modo de División (Requerimiento clave de la skill) */}
        <section className="mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  1. Elegí cómo dividir la cuenta
                </span>
                <h2 className="text-lg font-semibold text-white mt-0.5">
                  ¿Cada uno pidió algo distinto o dividen todo por igual?
                </h2>
              </div>

              {/* Botones Toggle de Modo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('detailed')}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                    mode === 'detailed'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Utensils className="w-4 h-4" />
                  Por consumo + compartidos
                </button>
                <button
                  type="button"
                  onClick={() => setMode('equal')}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                    mode === 'equal'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  ¡Todos consumimos lo mismo!
                </button>
              </div>
            </div>

            {/* Explicación dinámica del modo activo */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-300">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              {mode === 'detailed' ? (
                <p>
                  <strong className="text-white">Modo Detallado activo:</strong> Cada persona paga su plato individual y la diferencia entre el gasto total y la suma de los platos (como papas fritas, bebidas, hielo, envío o propina) se reparte automáticamente en partes iguales entre todos.
                </p>
              ) : (
                <p>
                  <strong className="text-white">Vía Rápida activa ("Todos consumimos lo mismo"):</strong> No hace falta anotar qué comió cada uno. Se suma todo lo que pusieron al pozo y se divide en partes exactamente iguales entre los {participants.length} integrantes.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Layout Principal en 2 Columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMNA IZQUIERDA: Carga de participantes y gastos (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Nombre de la juntada */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    2. Integrantes y consumos
                  </span>
                  <h3 className="text-base font-semibold text-white">
                    ¿Cuánto puso cada uno{mode === 'detailed' ? ' y qué consumió?' : '?'}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="Nombre del evento..."
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Lista de tarjetas de participantes */}
              <div className="space-y-3">
                {participants.map((person, index) => (
                  <div
                    key={person.id}
                    className="bg-slate-950/90 border border-slate-800/90 hover:border-slate-700 rounded-xl p-3.5 transition"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      {/* Nombre */}
                      <div className={mode === 'detailed' ? 'sm:col-span-3' : 'sm:col-span-5'}>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Participante #{index + 1}
                        </label>
                        <input
                          type="text"
                          value={person.name}
                          onChange={(e) =>
                            handleUpdateParticipant(person.id, 'name', e.target.value)
                          }
                          placeholder="Nombre"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm font-medium text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Cuánto pagó / puso */}
                      <div className={mode === 'detailed' ? 'sm:col-span-4' : 'sm:col-span-6'}>
                        <label className="block text-[11px] font-medium text-emerald-400 mb-1">
                          ¿Cuánto pagó / puso?
                        </label>
                        <div className="flex gap-1.5">
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                              $
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={person.paid === 0 ? '' : person.paid}
                              onChange={(e) =>
                                handleUpdateParticipant(person.id, 'paid', e.target.value)
                              }
                              placeholder="0"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-6 pr-2 py-2 text-sm font-semibold text-emerald-300 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <input
                            type="text"
                            value={person.paidDesc}
                            onChange={(e) =>
                              handleUpdateParticipant(person.id, 'paidDesc', e.target.value)
                            }
                            placeholder="Ej. Cocas, Hielo"
                            className="w-28 bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Qué consumió individualmente (Solo en modo detallado) */}
                      {mode === 'detailed' && (
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-medium text-amber-400 mb-1">
                            Consumo individual
                          </label>
                          <div className="flex gap-1.5">
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                                $
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={person.consumed === 0 ? '' : person.consumed}
                                onChange={(e) =>
                                  handleUpdateParticipant(person.id, 'consumed', e.target.value)
                                }
                                placeholder="0"
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-6 pr-2 py-2 text-sm font-semibold text-amber-300 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <input
                              type="text"
                              value={person.consumedDesc}
                              onChange={(e) =>
                                handleUpdateParticipant(person.id, 'consumedDesc', e.target.value)
                              }
                              placeholder="Ej. Choripán"
                              className="w-28 bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* Botón Eliminar */}
                      <div className="sm:col-span-1 flex sm:justify-end pt-2 sm:pt-5">
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(person.id)}
                          disabled={participants.length <= 1}
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                          title="Eliminar participante"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Formulario para agregar nuevo integrante */}
              <form
                onSubmit={handleAddParticipant}
                className="mt-4 pt-4 border-t border-slate-800/80"
              >
                <p className="text-xs font-medium text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  Agregar otro amigo a la cuenta
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className={mode === 'detailed' ? 'sm:col-span-3' : 'sm:col-span-5'}>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nombre (ej. Sofi)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className={mode === 'detailed' ? 'sm:col-span-3' : 'sm:col-span-4'}>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={newPaid}
                      onChange={(e) => setNewPaid(e.target.value)}
                      placeholder="¿Cuánto puso? ($)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {mode === 'detailed' && (
                    <div className="sm:col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={newConsumed}
                        onChange={(e) => setNewConsumed(e.target.value)}
                        placeholder="¿Consumo indiv.? ($)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      className="w-full h-full flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm py-2 px-4 rounded-lg transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Sumar
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Alerta si los platos individuales superan el total pagado */}
            {calculations.hasDeficitError && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/90 space-y-1">
                  <p className="font-semibold text-amber-300 text-sm">
                    Atención: La suma de los platos individuales supera lo que pagaron
                  </p>
                  <p>
                    Los consumos individuales suman{' '}
                    <strong>{formatCurrency(calculations.totalIndividualConsumed)}</strong>, pero el
                    total pagado cargado es de{' '}
                    <strong>{formatCurrency(calculations.totalPaid)}</strong>. Faltan asignar{' '}
                    <strong>{formatCurrency(calculations.deficitAmount)}</strong> en la columna
                    &quot;¿Cuánto pagó / puso?&quot;.
                  </p>
                </div>
              </div>
            )}

            {/* Desglose Matemático Detallado por Persona */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Desglose transparente
                  </span>
                  <h3 className="text-base font-semibold text-white">
                    Cálculo paso a paso por integrante
                  </h3>
                </div>
                <Receipt className="w-5 h-5 text-slate-400" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 pr-2">Integrante</th>
                      {mode === 'detailed' && <th className="py-2.5 px-2 text-right">Plato Indiv.</th>}
                      <th className="py-2.5 px-2 text-right">
                        {mode === 'detailed' ? 'Cuota Comp.' : 'Cuota Igual'}
                      </th>
                      <th className="py-2.5 px-2 text-right">Total Consumido</th>
                      <th className="py-2.5 px-2 text-right">Ya Puso</th>
                      <th className="py-2.5 pl-2 text-right">Saldo Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {calculations.breakdown.map((item) => {
                      const isCreditor = item.balance > 0.5;
                      const isDebtor = item.balance < -0.5;
                      return (
                        <tr key={item.id} className="hover:bg-slate-800/30">
                          <td className="py-3 pr-2 font-medium text-white">
                            <div>{item.name || 'Sin nombre'}</div>
                            {(item.paidDesc || item.consumedDesc) && (
                              <div className="text-[11px] text-slate-400 font-normal">
                                {[item.consumedDesc, item.paidDesc ? `Pagó: ${item.paidDesc}` : '']
                                  .filter(Boolean)
                                  .join(' • ')}
                              </div>
                            )}
                          </td>
                          {mode === 'detailed' && (
                            <td className="py-3 px-2 text-right text-slate-300">
                              {formatCurrency(item.individual)}
                            </td>
                          )}
                          <td className="py-3 px-2 text-right text-slate-300">
                            {formatCurrency(item.sharedQuota)}
                          </td>
                          <td className="py-3 px-2 text-right font-semibold text-white">
                            {formatCurrency(item.finalCost)}
                          </td>
                          <td className="py-3 px-2 text-right text-emerald-400">
                            {formatCurrency(item.paid)}
                          </td>
                          <td className="py-3 pl-2 text-right font-bold">
                            {isCreditor && (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-xs">
                                A favor +{formatCurrency(item.balance)}
                              </span>
                            )}
                            {isDebtor && (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 text-xs">
                                Debe {formatCurrency(Math.abs(item.balance))}
                              </span>
                            )}
                            {!isCreditor && !isDebtor && (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-xs">
                                A mano $0
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Resumen General y Transferencias (5 cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            {/* Tarjetas de Resumen del Pozo */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  3. Resumen de la cuenta
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <Users className="w-3.5 h-3.5" />
                  {participants.length} personas
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5">
                  <span className="text-xs text-slate-400 block">Gasto Total Grupal</span>
                  <span className="text-2xl font-bold text-white mt-1 block">
                    {formatCurrency(calculations.totalPaid)}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Suma de todos los pagos
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5">
                  <span className="text-xs text-slate-400 block">
                    {mode === 'detailed' ? 'Gasto Compartido c/u' : 'Costo por persona'}
                  </span>
                  <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                    {formatCurrency(calculations.sharedPerPerson)}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    {mode === 'detailed'
                      ? `De ${formatCurrency(calculations.sharedPool)} compartidos`
                      : `Total dividido por ${participants.length}`}
                  </span>
                </div>
              </div>

              {mode === 'detailed' && (
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block">Platos individuales sumados:</span>
                    <span className="font-semibold text-amber-300">
                      {formatCurrency(calculations.totalIndividualConsumed)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block">Pozo compartido (papas, bebida, hielo):</span>
                    <span className="font-semibold text-emerald-300">
                      {formatCurrency(calculations.sharedPool)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Panel Principal: ¿Quién le transfiere a quién? */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-900/95 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-emerald-950/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Liquidación final
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    ¿Quién le tiene que transferir a quién?
                  </h3>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              {calculations.transfers.length === 0 ? (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-6 text-center">
                  <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white">¡Cuentas saldadas!</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Nadie le debe plata a nadie con los montos actuales.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {calculations.transfers.map((t, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 border border-slate-800/90 hover:border-emerald-500/40 rounded-xl p-3.5 flex items-center justify-between gap-2 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold text-sm truncate">
                          {t.from}
                        </span>
                        <div className="flex flex-col items-center text-slate-500 shrink-0">
                          <span className="text-[10px] uppercase tracking-wider">le pasa a</span>
                          <ArrowRight className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-sm truncate">
                          {t.to}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-lg font-extrabold text-white">
                          {formatCurrency(t.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón para copiar a WhatsApp */}
              <div className="mt-5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition shadow-lg cursor-pointer ${
                    copied
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      ¡Resumen copiado para pegar en WhatsApp!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar resumen para WhatsApp
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}