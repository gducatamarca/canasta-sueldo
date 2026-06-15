/* ════════════════════════════════
   PANTALLA DE CARGA
   ════════════════════════════════ */
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
  }, 1600);
});

/* ════════════════════════════════
   DATOS GLOBALES
   ════════════════════════════════ */
let SALARIOS    = {};
let PRE_CARGOS  = {};
let PRE_TRAMOS  = [];
let tipoActivo  = 'universitario';
let ultimoResultado = {
  tipo: '', dedicacion: '', cargo: '',
  antTexto: '', posTexto: '', total: ''
};

/* ════════════════════════════════
   CARGA DEL JSON
   ════════════════════════════════ */
fetch('datos_salarios.json')
  .then(r => {
    if (!r.ok) throw new Error('No se pudo cargar datos_salarios.json');
    return r.json();
  })
  .then(data => {
    SALARIOS   = data.dedicaciones;
    PRE_CARGOS = data.preuniversitarios.cargos;
    PRE_TRAMOS = data.preuniversitarios.antiguedad_tramos;

    const sub = document.getElementById('calc-subtitle');
    if (sub && data.ultima_actualizacion) {
      sub.textContent = `Escala salarial ${data.ultima_actualizacion} · GDU Catamarca`;
    }

    cargarDedicaciones();
    cargarSelectsPre();
  })
  .catch(err => {
    console.error('Error cargando salarios:', err);
    const sub = document.getElementById('calc-subtitle');
    if (sub) {
      sub.textContent = '⚠ Error al cargar la escala. Recargá la página.';
      sub.style.color = '#FF6B6B';
    }
  });

/* ════════════════════════════════
   SWITCH UNIVERSITARIO / PREUNIVERSITARIO
   ════════════════════════════════ */
function switchTipo(tipo) {
  tipoActivo = tipo;

  document.getElementById('btn-universitario').classList.toggle('activo', tipo === 'universitario');
  document.getElementById('btn-preuniversitario').classList.toggle('activo', tipo === 'preuniversitario');
  document.getElementById('panel-universitario').style.display    = tipo === 'universitario'    ? 'block' : 'none';
  document.getElementById('panel-preuniversitario').style.display = tipo === 'preuniversitario' ? 'block' : 'none';

  document.getElementById('calc-resultado').classList.remove('visible');
  document.getElementById('btn-pdf').classList.remove('visible');
}

/* ════════════════════════════════
   UNIVERSITARIO — LÓGICA
   ════════════════════════════════ */
function cargarDedicaciones() {
  const sel = document.getElementById('dedicacion');
  sel.innerHTML = '';
  for (let d in SALARIOS) {
    sel.innerHTML += `<option value="${d}">${d}</option>`;
  }
  cargarCargos();
}

function cargarCargos() {
  const ded = document.getElementById('dedicacion').value;
  const sel = document.getElementById('cargo');
  sel.innerHTML = '';
  for (let c in SALARIOS[ded]) {
    sel.innerHTML += `<option value="${c}">${c}</option>`;
  }
}

function calcular() {
  if (!SALARIOS || Object.keys(SALARIOS).length === 0) {
    alert('Los datos todavía están cargando. Intentá en un momento.');
    return;
  }
  const dedicacion = document.getElementById('dedicacion').value;
  const cargo      = document.getElementById('cargo').value;
  const antiguedad = parseFloat(document.getElementById('antiguedad').value);
  const posgrado   = parseFloat(document.getElementById('posgrado').value);
  const antTexto   = document.getElementById('antiguedad').selectedOptions[0].text;
  const posTexto   = document.getElementById('posgrado').selectedOptions[0].text;

  const basico = SALARIOS[dedicacion][cargo];
  const total  = basico * (1 + antiguedad) * (1 + posgrado);
  const totalFmt = '$ ' + total.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  ultimoResultado = {
    tipo: 'Universitario', dedicacion, cargo,
    antTexto, posTexto, total: totalFmt
  };

  document.getElementById('calc-total').textContent = totalFmt;
  document.getElementById('calc-detalle').innerHTML =
    `<strong style="color:var(--blanco)">${dedicacion} · ${cargo}</strong><br>
     Antigüedad: ${antTexto} · Posgrado: ${posTexto}`;

  mostrarResultado();
}

/* ════════════════════════════════
   PREUNIVERSITARIO — LÓGICA
   ════════════════════════════════ */
function cargarSelectsPre() {
  const selCargo = document.getElementById('pre-cargo');
  selCargo.innerHTML = '';
  for (let nombre in PRE_CARGOS) {
    selCargo.innerHTML += `<option value="${nombre}">${nombre}</option>`;
  }

  const selAnt = document.getElementById('pre-antiguedad');
  selAnt.innerHTML = '';
  PRE_TRAMOS.forEach(t => {
    selAnt.innerHTML += `<option value="${t.factor}">${t.label}</option>`;
  });
}

function calcularPre() {
  if (!PRE_CARGOS || Object.keys(PRE_CARGOS).length === 0) {
    alert('Los datos todavía están cargando. Intentá en un momento.');
    return;
  }
  const cargo    = document.getElementById('pre-cargo').value;
  const factor   = parseFloat(document.getElementById('pre-antiguedad').value);
  const posgrado = parseFloat(document.getElementById('pre-posgrado').value);
  const antTexto = document.getElementById('pre-antiguedad').selectedOptions[0].text;
  const posTexto = document.getElementById('pre-posgrado').selectedOptions[0].text;

  const basico   = PRE_CARGOS[cargo];
  const total    = basico * factor * (1 + posgrado);
  const totalFmt = '$ ' + total.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  ultimoResultado = {
    tipo: 'Preuniversitario', dedicacion: 'Preuniversitario', cargo,
    antTexto, posTexto, total: totalFmt
  };

  document.getElementById('calc-total').textContent = totalFmt;
  document.getElementById('calc-detalle').innerHTML =
    `<strong style="color:var(--blanco)">Preuniversitario · ${cargo}</strong><br>
     Antigüedad: ${antTexto} · Posgrado: ${posTexto}`;

  mostrarResultado();
}

/* ════════════════════════════════
   MOSTRAR RESULTADO
   ════════════════════════════════ */
function mostrarResultado() {
  document.getElementById('calc-resultado').classList.add('visible');
  document.getElementById('btn-pdf').classList.add('visible');
  document.getElementById('calc-resultado').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ════════════════════════════════
   PDF
   ════════════════════════════════ */
function descargarPDF() {
  const { jsPDF } = window.jspdf;
  const doc  = new jsPDF();
  const r    = ultimoResultado;
  const fecha = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const img  = new Image();
  img.src    = 'logo-gdu.png';
  img.onload = function () {

    doc.setFillColor(8, 17, 28);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setFillColor(27, 63, 114);
    doc.rect(0, 0, 210, 38, 'F');
    doc.addImage(img, 'PNG', 10, 6, 100, 26);
    doc.setTextColor(212, 160, 23);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Emisión: ${fecha}`, 200, 12, { align: 'right' });
    doc.text('Mayo 2026', 200, 20, { align: 'right' });

    doc.setDrawColor(212, 160, 23);
    doc.setLineWidth(0.8);
    doc.line(10, 44, 200, 44);

    doc.setTextColor(247, 249, 252);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Constancia de Cálculo Salarial', 105, 58, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(160, 174, 192);
    doc.setFont('helvetica', 'normal');

    const subtituloTipo = r.tipo === 'Preuniversitario'
      ? 'Escala preuniversitaria · CONADU HISTÓRICA · GDU Catamarca'
      : 'Escala universitaria · CONADU HISTÓRICA · GDU Catamarca';
    doc.text(subtituloTipo, 105, 66, { align: 'center' });

    doc.setFillColor(14, 28, 45);
    doc.roundedRect(14, 76, 182, 74, 4, 4, 'F');
    doc.setDrawColor(45, 111, 191);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, 76, 182, 74, 4, 4, 'S');

    doc.setTextColor(212, 160, 23);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE LA SIMULACIÓN', 22, 86);

    const items = [
      ['Tipo:',        r.tipo],
      ['Cargo:',       r.cargo],
      r.tipo === 'Universitario' ? ['Dedicación:', r.dedicacion] : null,
      ['Antigüedad:',  r.antTexto],
      ['Posgrado:',    r.posTexto],
    ].filter(Boolean);

    let y = 96;
    items.forEach(([lbl, val]) => {
      doc.setTextColor(160, 174, 192);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(lbl, 22, y);
      doc.setTextColor(247, 249, 252);
      doc.setFont('helvetica', 'bold');
      const valLines = doc.splitTextToSize(val, 108);
      doc.text(valLines, 70, y);
      y += 11 * valLines.length;
    });

    doc.setFillColor(27, 63, 114);
    doc.roundedRect(14, 160, 182, 52, 4, 4, 'F');
    doc.setDrawColor(212, 160, 23);
    doc.setLineWidth(0.6);
    doc.roundedRect(14, 160, 182, 52, 4, 4, 'S');
    doc.setTextColor(160, 174, 192);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SALARIO BRUTO ESTIMADO', 105, 173, { align: 'center' });
    doc.setTextColor(126, 200, 240);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(r.total, 105, 197, { align: 'center' });

    doc.setDrawColor(212, 160, 23);
    doc.setLineWidth(0.4);
    doc.line(14, 222, 196, 222);

    doc.setFillColor(50, 10, 10);
    doc.roundedRect(14, 226, 182, 40, 3, 3, 'F');
    doc.setDrawColor(180, 30, 30);
    doc.setLineWidth(0.35);
    doc.roundedRect(14, 226, 182, 40, 3, 3, 'S');

    doc.setTextColor(255, 160, 160);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('⚠  AVISO IMPORTANTE', 22, 235);

    doc.setTextColor(220, 180, 180);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const avisoTexto =
      'Este cálculo es estimativo. Los descuentos por Ley son aproximadamente el 21%, que ' +
      'contemplan aportes jubilatorios, obra social e impuesto a las ganancias (según corresponda). ' +
      'No incluye descuentos adicionales locales, cuota sindical ni otros añadidos. ' +
      'Para liquidación oficial consultá con tu área de RRHH.';
    doc.text(doc.splitTextToSize(avisoTexto, 172), 22, 242);

    doc.setTextColor(70, 90, 110);
    doc.setFontSize(7);
    doc.text(
      'Fuente: Instructivo de Liquidación Mayo 2026 · CONADU HISTÓRICA',
      105, 274, { align: 'center' }
    );

    doc.setFillColor(14, 28, 45);
    doc.rect(0, 279, 210, 18, 'F');
    doc.setDrawColor(212, 160, 23);
    doc.setLineWidth(0.3);
    doc.line(0, 279, 210, 279);
    doc.setTextColor(212, 160, 23);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('GDU CATAMARCA · CONADU HISTÓRICA', 105, 287, { align: 'center' });
    doc.setTextColor(90, 112, 144);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(
      'instagram.com/gducatamarca · facebook.com/gremiodocente.universitario',
      105, 293, { align: 'center' }
    );

    doc.save(`Calculo_Salarial_GDU_${fecha.replace(/\//g, '-')}.pdf`);
  };
}

/* ════════════════════════════════
   OBSERVER — ANIMACIONES
   ════════════════════════════════ */
function animateCounter(el, from, to, duration, prefix='', suffix='') {
  const start    = performance.now();
  const decimals = String(to).includes('.') ? String(to).split('.')[1].length : 0;
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease     = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const val      = from + (to - from) * ease;
    el.textContent = prefix + val.toLocaleString('es-AR', {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals
    }) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function activateBars(container) {
  container.querySelectorAll('.barra-fill').forEach((bar, i) => {
    setTimeout(() => {
      bar.style.width = bar.dataset.w + '%';
      bar.classList.add('animada');
    }, i * 250);
  });
}

const counterMap = {
  'counter-deficit':   { from: 0, to: 953441, prefix: '-$', suffix: '',  duration: 1600 },
  'counter-pct':       { from: 0, to: 36.4,   prefix: '',   suffix: '%', duration: 1200 },
  'counter-variacion': { from: 0, to: 2.0,    prefix: '+',  suffix: '%', duration: 900  },
};
let countersTriggered = false;

const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('visible');
    activateBars(e.target);
    if (e.target.classList.contains('impacto-grid') && !countersTriggered) {
      countersTriggered = true;
      Object.entries(counterMap).forEach(([id, cfg]) => {
        const el = document.getElementById(id);
        if (el) animateCounter(el, cfg.from, cfg.to, cfg.duration, cfg.prefix, cfg.suffix);
      });
    }
    observer.unobserve(e.target);
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));