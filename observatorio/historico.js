"use strict";
(()=>{
const $=id=>document.getElementById(id);
const fullMonth=id=>{const [y,m]=id.split("-").map(Number);return new Date(y,m-1,15).toLocaleDateString("es-AR",{month:"long",year:"numeric"});};
const fmt=(n,max=1)=>new Intl.NumberFormat("es-AR",{minimumFractionDigits:1,maximumFractionDigits:max}).format(n);
let data,mainChart,compChart;
function renderSelection(){
 const select=$("mes").value;
 const item=data.serie.find(x=>x.periodo===select);
 if(!item)return;
 const index=item.indice_real,loss=index-100,recovery=(100/index-1)*100;
 $("kpi-perdida").textContent=(loss>0?"+":"")+fmt(loss)+"%";
 $("kpi-recomposicion").textContent="+"+fmt(Math.max(0,recovery))+"%";
 $("kpi-indice").textContent=fmt(index);
 $("kpi-conservado").textContent=fmt(index)+"%";
 $("interpretacion").textContent=loss<0?
 "En "+fullMonth(select)+", el salario real equivale al "+fmt(index)+"% del nivel de noviembre de 2023: pérdida del "+fmt(-loss)+"%. Para recuperar el poder de compra inicial se necesita una recomposición del "+fmt(recovery)+"% sobre el nivel de ese mes.":
 "En "+fullMonth(select)+" el índice real es "+fmt(index)+" (noviembre de 2023 = 100).";
 if(mainChart) { mainChart.data.datasets[2].data=data.serie.map(x=>x.periodo===select?x.indice_real:null);mainChart.update();}
}
function createChart(){
 if(!window.Chart)return;
 const labels=data.serie.map(x=>x.periodo.slice(2).replace("-","/"));
 const common={responsive:true,maintainAspectRatio:false,
 plugins:{legend:{labels:{color:"#a0aec0",font:{size:11},boxWidth:12}},tooltip:{callbacks:{label:c=>c.dataset.label+": "+fmt(c.parsed.y)+(c.datasetIndex===0?"":"")}}},
 scales:{x:{ticks:{color:"#a0aec0",autoSkip:true,maxTicksLimit:10},grid:{display:false}},y:{min:50,max:105,ticks:{color:"#a0aec0"},grid:{color:"#26394e"}}}};
 mainChart=new window.Chart($("grafico-real"),{type:"line",data:{labels,datasets:[
 {label:"Nivel noviembre 2023 = 100",data:labels.map(()=>100),borderColor:"#d4a017",borderDash:[6,5],pointRadius:0,borderWidth:2},
 {label:"Salario real",data:data.serie.map(x=>x.indice_real),borderColor:"#7ec8f0",backgroundColor:"rgba(126,200,240,.1)",fill:true,tension:.2,pointRadius:1.8,borderWidth:2.6},
 {label:"Mes seleccionado",data:[],borderColor:"#ff7979",backgroundColor:"#ff7979",pointRadius:5,showLine:false}
 ]},options:common});
 compChart=new window.Chart($("grafico-acumulado"),{type:"bar",data:{labels:["IPC acumulado","Salarios nominales"],datasets:[{label:"Variación desde nov. 2023",data:[data.acumulados.inflacion_pct,data.acumulados.aumento_nominal_pct],backgroundColor:["#ff7979","#7ec8f0"],borderRadius:8,barThickness:65}]},
 options:{responsive:true,maintainAspectRatio:false,indexAxis:"y",plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>fmt(c.parsed.x)+"%"}}},scales:{x:{min:0,ticks:{color:"#a0aec0",callback:x=>x+"%"},grid:{color:"#26394e"}},y:{ticks:{color:"#f7f9fc",font:{size:11}},grid:{display:false}}}}});
}
function table(){
 const target=$("filas");target.innerHTML="";
 for(const record of data.serie){
  const tr=document.createElement("tr");
  const loss=record.indice_real-100,rec=(100/record.indice_real-1)*100;
  const cells=[fullMonth(record.periodo),fmt(record.indice_real), (loss>0?"+":"")+fmt(loss)+"%",(rec>0?"+":"")+fmt(Math.max(rec,0))+"%"];
  for(const value of cells){const td=document.createElement("td");td.textContent=value;tr.appendChild(td)}
  target.appendChild(tr);
 }
}
function csv(){
 const lines=[["periodo","indice_real_base_nov_2023_100","variacion_real_pct","recomposicion_necesaria_pct"],...data.serie.map(x=>[x.periodo,x.indice_real,Math.round((x.indice_real-100)*10)/10,Math.round((100/x.indice_real-1)*1000)/10])];
 const payload="\uFEFF"+lines.map(row=>row.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(";")).join("\r\n");
 const blob=new Blob([payload],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="GDU_salario_real_nov2023_oct2026.csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
async function init(){
 try{
  const response=await fetch("observatorio/historico-2023-2026.json?v=20261121",{cache:"no-store"});
  if(!response.ok)throw Error("No se pudo cargar la serie");
  data=await response.json();
  if(!Array.isArray(data.serie)||data.serie.length!==36||data.serie[0].periodo!=="2023-11"||data.serie.at(-1).periodo!=="2026-10")throw Error("Serie histórica incompleta");
  const select=$("mes");for(const x of data.serie){const opt=document.createElement("option");opt.value=x.periodo;opt.textContent=fullMonth(x.periodo);select.appendChild(opt)}
  select.value="2026-10";table();createChart();renderSelection();
  select.addEventListener("change",renderSelection);
  $("descargar").addEventListener("click",csv);
  if(!window.Chart){for(const id of ["grafico-real","grafico-acumulado"]){const e=$(id);if(e)e.replaceWith(document.createTextNode("Los gráficos requieren conexión para cargar Chart.js. La tabla histórica y los indicadores siguen disponibles."));}}
 }catch(error){console.error("Observatorio histórico GDU",error);$("interpretacion").textContent="No pudimos cargar la serie histórica. Consultá el documento fuente o intentá recargar la página.";}
}
init();
})();