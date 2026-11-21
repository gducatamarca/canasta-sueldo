"use strict";
(function () {
  const $ = (id) => document.getElementById(id);
  const names = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const peso = (n) => Number.isFinite(n) ? new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",minimumFractionDigits:2,maximumFractionDigits:2}).format(n) : "—";
  const pct = (n, signed=false) => Number.isFinite(n) ? (signed && n>0?"+":"")+new Intl.NumberFormat("es-AR",{minimumFractionDigits:1,maximumFractionDigits:2}).format(n)+"%" : "—";
  const monthName = (id) => {
    const [year,month]=id.split("-").map(Number);
    return names[month-1].slice(0,1).toUpperCase()+names[month-1].slice(1)+" "+year;
  };
  const values = {observatorio:null,salarios:null,meses:[],mensual:null,acumulado:null};
  function option(select, value, label) {const opt=document.createElement("option");opt.value=value;opt.textContent=label;select.appendChild(opt);}
  function selectedRange() {
    const start=$("periodo-desde").value, end=$("periodo-hasta").value;
    if(start>end){$("periodo-hasta").value=start;return values.meses.filter(x=>x>=start);}
    return values.meses.filter(x=>x>=start && x<=end);
  }
  function calculate(months) {
    let inflation=1,salary=1;
    const data=values.observatorio.periodos;
    const rows=[];
    for(const month of months){
      const row=data[month], i=row.ipc/100, s=row.aumento/100;
      inflation*=(1+i);salary*=(1+s);
      rows.push({month,ipc:row.ipc,raise:row.aumento,inflation:(inflation-1)*100,salary:(salary-1)*100,real:(salary/inflation-1)*100,checked:row.estado_ipc==="oficial"&&row.estado_aumento!=="pendiente"});
    }
    return {inflation:(inflation-1)*100,salary:(salary-1)*100,real:(salary/inflation-1)*100,recovery:Math.max(0,(inflation/salary-1)*100),rows};
  }
  function updatePeriod(){
    const months=selectedRange(),r=calculate(months);
    $("kpi-ipc").textContent=pct(r.inflation);
    $("kpi-salario").textContent=pct(r.salary);
    $("kpi-real").textContent=pct(r.real,true);
    $("kpi-real").classList.toggle("negative",r.real<0);
    $("kpi-recuperacion").textContent=pct(r.recovery);
    renderCharts(r);
  }
  function chart(context,data,options,existing){
    if(typeof window.Chart==="undefined")return null;
    if(existing)existing.destroy();
    return new window.Chart(context,{data,options});
  }
  function renderCharts(r){
    const labels=r.rows.map(x=>monthName(x.month).split(" ")[0].slice(0,3));
    const common={
      responsive:true,maintainAspectRatio:false,animation:{duration:350},
      interaction:{mode:"index",intersect:false},
      plugins:{legend:{labels:{color:"#A0AEC0",font:{size:11},boxWidth:11}},tooltip:{callbacks:{label:function(c){return c.dataset.label+": "+pct(c.parsed.y);}}}},
      scales:{x:{ticks:{color:"#A0AEC0"},grid:{display:false}},y:{ticks:{color:"#A0AEC0",callback:(v)=>v+"%"},grid:{color:"#24384d"}}}
    };
    values.mensual=chart($("chart-mensual"),{type:"bar",labels,datasets:[
      {label:"Inflación",data:r.rows.map(x=>x.ipc),backgroundColor:"#2D6FBF",borderRadius:3},
      {label:"Aumento",data:r.rows.map(x=>x.raise),backgroundColor:"#D4A017",borderRadius:3}
    ]},common,values.mensual);
    values.acumulado=chart($("chart-acumulado"),{type:"line",labels,datasets:[
      {label:"Inflación",data:r.rows.map(x=>x.inflation),borderColor:"#FF7979",backgroundColor:"#FF7979",tension:.25,pointRadius:3},
      {label:"Salarios",data:r.rows.map(x=>x.salary),borderColor:"#7EC8F0",backgroundColor:"#7EC8F0",tension:.25,pointRadius:3}
    ]},common,values.acumulado);
    if(typeof window.Chart==="undefined"){
      $("chart-mensual").replaceWith(document.createTextNode("El gráfico no está disponible. Los datos pueden consultarse en la tabla histórica."));
      $("chart-acumulado").replaceWith(document.createTextNode("El gráfico no está disponible. Los datos pueden consultarse en la tabla histórica."));
    }
  }
  function fillSalaryOptions(){
    const ds=values.salarios.dedicaciones||{};
    const target=$("cargo-ded");target.innerHTML="";
    ["Simple","Semiexclusiva","Exclusiva"].filter(k=>ds[k]).forEach(k=>option(target,k,k));
    target.value=ds["Simple"]?"Simple":Object.keys(ds)[0];
    target.addEventListener("change",()=>{fillCategories();updateCanastas();});
    $("cargo-categoria").addEventListener("change",updateCanastas);
    fillCategories();
  }
  function fillCategories(){
    const ded=$("cargo-ded").value, sel=$("cargo-categoria");sel.innerHTML="";
    Object.keys(values.salarios.dedicaciones[ded]||{}).forEach(k=>option(sel,k,k));
    sel.value=(values.salarios.dedicaciones[ded]||{}).JTP?"JTP":sel.options[0]?.value;
    updateCanastas();
  }
  function currentSalary(){
    const salary=values.salarios.dedicaciones[$("cargo-ded").value]||{};
    return Number(salary[$("cargo-categoria").value]);
  }
  function updateCanastas(){
    if(!values.observatorio || !values.salarios)return;
    const c=values.observatorio.canastas["2026-10"];if(!c)return;
    const wage=currentSalary();
    $("valor-cbt").textContent=peso(c.cbt_hogar2);
    $("valor-cba").textContent=peso(c.cba_hogar2);
    $("cobertura-cbt").textContent="El básico seleccionado ("+peso(wage)+") cubre "+pct(100*wage/c.cbt_hogar2)+" de la CBT. Diferencia: "+peso(c.cbt_hogar2-wage)+".";
    $("cobertura-cba").textContent="El básico seleccionado ("+peso(wage)+") equivale al "+pct(100*wage/c.cba_hogar2)+" de la CBA. Diferencia: "+peso(c.cba_hogar2-wage)+".";
  }
  function fillMonths(){
    values.meses=Object.keys(values.observatorio.periodos).sort();
    for(const month of values.meses){option($("periodo-desde"),month,monthName(month));option($("periodo-hasta"),month,monthName(month));}
    $("periodo-desde").value=values.meses[0];
    $("periodo-hasta").value=values.meses[values.meses.length-1];
    for(const month of values.meses.slice(0,-1))option($("mes-origen"),month,monthName(month));
    $("mes-origen").value=values.meses[0];
    $("periodo-desde").addEventListener("change",updatePeriod);
    $("periodo-hasta").addEventListener("change",updatePeriod);
  }
  function compare(){
    const out=$("resultado-comparador"),base=Number($("salario-origen").value);
    if(!Number.isFinite(base)||base<=0||$("salario-origen").value.trim()===""){
      out.textContent="Ingresá un sueldo básico válido del mes anterior (mayor que cero).";return;
    }
    const ref=$("mes-origen").value,months=values.meses.filter(m=>m>ref && m<="2026-10");
    if(!months.length){out.textContent="El mes de referencia debe ser anterior a octubre de 2026.";return;}
    let factor=1;
    for(const month of months)factor*=1+values.observatorio.periodos[month].ipc/100;
    const required=base*factor,actual=currentSalary(),difference=actual-required,real=(actual/required-1)*100;
    const info=[
      "Cargo: "+$("cargo-categoria").value+" · "+$("cargo-ded").value+".",
      "Básico declarado para "+monthName(ref)+": "+peso(base)+".",
      "Equivalente ajustado por IPC a octubre de 2026: "+peso(required)+".",
      "Básico vigente en octubre de 2026: "+peso(actual)+".",
      "Diferencia: "+peso(difference)+" ("+pct(real,true)+" real).",
      "Atención: el IPC histórico incluye datos del proyecto previo pendientes de validación. Compará siempre el mismo tipo de básico."
    ];
    out.textContent=info.join("\n");
    out.style.whiteSpace="pre-line";
  }
  function fillTable(){
    const tbody=$("tabla-meses");tbody.innerHTML="";
    for(const month of values.meses){
      const row=values.observatorio.periodos[month],tr=document.createElement("tr");
      const real=((1+row.aumento/100)/(1+row.ipc/100)-1)*100;
      const status=row.estado_ipc==="oficial"&&row.estado_aumento!=="pendiente"?"Verificado":"Por verificar";
      for(const [value,cls] of [[monthName(month),""],[pct(row.ipc),"right"],[pct(row.aumento),"right"],[pct(real,true),"right"],[status,""]]){
        const td=document.createElement("td");td.textContent=value;if(cls)td.className=cls;tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }
  function csv(){
    const rows=[["periodo","ipc_mensual_pct","aumento_mensual_pct","estado_ipc","estado_aumento"]];
    for(const m of values.meses){
      const d=values.observatorio.periodos[m];
      rows.push([m,d.ipc,d.aumento,d.estado_ipc,d.estado_aumento]);
    }
    const content="\uFEFF"+rows.map(row=>row.map(cell=>'"'+String(cell).replace(/"/g,'""')+'"').join(";")).join("\r\n");
    const blob=new Blob([content],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="observatorio-gdu-2026.csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }
  async function init(){
    try{
      const [a,b]=await Promise.all([
        fetch("observatorio/datos.json?v=1",{cache:"no-store"}),
        fetch("datos_salarios.json?v=observatorio-20261120",{cache:"no-store"})
      ]);
      if(!a.ok||!b.ok)throw Error("No se pudieron cargar las tablas de datos");
      values.observatorio=await a.json();values.salarios=await b.json();
      if(!values.observatorio.periodos||!values.salarios.dedicaciones)throw Error("Faltan secciones obligatorias de los datos");
      fillMonths();fillSalaryOptions();fillTable();updatePeriod();
      $("btn-comparar").addEventListener("click",compare);
      $("descargar-csv").addEventListener("click",csv);
      $("alerta-datos").innerHTML="<strong>Serie de trabajo:</strong> enero–septiembre de 2026 conservan cifras del sitio anterior pendientes de cotejo. Octubre de 2026 utiliza IPC oficial INDEC (2,2%) y el aumento del 3% documentado. Los indicadores acumulados se deben leer como <strong>preliminares</strong> hasta completar la auditoría histórica.";
    }catch(error){
      console.error("Observatorio GDU:",error);
      $("alerta-datos").textContent="No fue posible cargar los datos. Probá recargar la página o consultá más tarde.";
    }
  }
  init();
})();