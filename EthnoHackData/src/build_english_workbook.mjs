/** English presentation of preserved numerical snapshots, added 2026-11-03.
 * Run export_english.py first. Requires @oai/artifact-tool in the Node environment.
 * Usage: node src/build_english_workbook.mjs [role_a_data_dir] [preview_dir]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const root = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const outputDir = path.join(root, 'outputs/english');
const previewDir = process.argv[3] ? path.resolve(process.argv[3]) : null;
const data = JSON.parse(await fs.readFile(path.join(root, 'build/english_workbook_data.json'), 'utf8'));
const views = data.views;
const wb = Workbook.create();
const numeric = v => v === '' || v === null || v === undefined ? null : Number(v);
const statusText = s => s === 'NOT_USED' ? 'Not used' : s === 'USED' ? 'Used' : 'Final ATC list pending';
function col(n) { let s=''; for(let x=n+1;x>0;x=Math.floor((x-1)/26))s=String.fromCharCode(65+(x-1)%26)+s;return s; }

function table(name, title, context, headers, rows, widths, height=42) {
  const s=wb.worksheets.add(name); s.showGridLines=false;
  const last=col(headers.length-1), end=5+rows.length;
  s.getRange(`A1:${last}${end}`).format.font={name:'Arial',size:10,color:'#172534'};
  s.getRange(`A1:${last}${end}`).format.verticalAlignment='center';
  s.getRange('A2').values=[[title]];
  s.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:'#183F4C'};
  s.getRange('A2').format.rowHeight=30;
  s.getRange('A3').values=[[context]];s.getRange('A3').format.font={name:'Arial',size:10,italic:true,color:'#405365'};
  s.getRange('A3').format.rowHeight=24;
  s.getRange(`A4:${last}4`).format.borders={bottom:{style:'thin',color:'#668695'}};
  s.getRange(`A5:${last}5`).values=[headers];
  s.getRange(`A6:${last}${end}`).values=rows;
  s.getRange(`A5:${last}5`).format={fill:'#214D5C',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},wrapText:true,horizontalAlignment:'center',verticalAlignment:'center',rowHeight:42};
  s.getRange(`A6:${last}${end}`).format.wrapText=true;
  s.getRange(`A6:${last}${end}`).format.rowHeight=height;
  widths.forEach((w,i)=>s.getRange(`${col(i)}1:${col(i)}${end}`).format.columnWidth=w);
  for(let i=6;i<=end;i+=2)s.getRange(`A${i}:${last}${i}`).format.fill='#F0F5F7';
  s.tables.add(`A5:${last}${end}`,true,name+'Table');
  s.freezePanes.freezeRows(5);
  s.freezePanes.freezeColumns(2);
  return s;
}

const scopeRows=views['candidates_en.csv'].map(r=>[r.atc5,r.name_en,statusText(r.final_project_status),r.historical_priority_en,r.plant_source,r.route_en]);
const scope=table('Scope','Candidate history and final project scope',
  `Team reports ${data.scope.final_substance_count_reported_by_team} substances used. Psyllium was not used. Exact final ATCs are pending.`,
  ['ATC5','Ingredient / material','Final project status','Historical priority','Plant source investigated','Route investigated'],scopeRows,[14,39,31,32,51,65],48);
scope.getRange('C6:C15').conditionalFormats.add('containsText',{text:'pending',format:{fill:'#FFF1CB',font:{color:'#79570F'}}});
scope.tabColor='#214D5C';

const factorRows=views['conversion_factors_en.csv'].map(r=>[r.atc5,r.name_en,numeric(r.mg_label_per_box),numeric(r.base_factor_reference),numeric(r.potential_api_kg_per_kg_material_reference),numeric(r.kg_material_per_box_ideal_reference),r.material_basis,statusText(r.final_project_status),r.base_factor_status,r.missing,r.source_url]);
const factors=table('Factors','Historical conversion factors',
  'Source: preserved conversion factors CSV. Ideal reference masses; all planning approvals remain 0.',
  ['ATC5','Ingredient / material','Label mg / box','Base / label factor','Potential API kg / kg material','Ideal material kg / box','Material basis','Final project status','Base-factor qualification','Missing production inputs','Recorded plant source'],factorRows,[14,39,21,20,25,25,53,31,62,68,85],100);
factors.getRange('C6:D15').setNumberFormat('0.000000');factors.getRange('E6:F15').setNumberFormat('0.000000000');
factors.getRange('C6:F15').format.horizontalAlignment='right';

const forecastRows=views['forecast_reference_en.csv'].map(r=>[new Date(r.month+'-01T00:00:00Z'),r.atc5,r.name_en,numeric(r.forecast_boxes),numeric(r.label_ingredient_kg),numeric(r.api_base_kg_reference),numeric(r.material_kg_ideal_reference),r.plant,r.status,numeric(r.planning_plant_kg),r.material_basis,statusText(r.final_project_status)]);
const forecast=table('Forecast','Historical five-ATC forecast conversion',
  'Source: preserved reference forecast CSV. Aug 2026–Jul 2027 dates follow Role B\'s message; no new forecasts added.',
  ['Month','ATC5','Ingredient','Forecast boxes','Label ingredient kg','API base kg reference','Ideal material kg reference','Plant material ID','Calculation status','Planning kg','Material basis','Final project status'],forecastRows,[14,14,35,23,24,26,27,43,48,21,55,31],64);
forecast.getRange('A6:A65').setNumberFormat('yyyy-mm');forecast.getRange('D6:D65').setNumberFormat('#,##0.00');
forecast.getRange('E6:G65').setNumberFormat('#,##0.000000');forecast.getRange('J6:J65').setNumberFormat('#,##0.000000');
forecast.getRange('D6:G65').format.horizontalAlignment='right';

const months=['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'];
const packRows=views['pack_mapping_en.csv'].map(r=>[r.cip13,r.atc5,r.product,numeric(r.units_per_box),numeric(r.mg_per_unit),numeric(r.mg_label_per_box),numeric(r.boxes_6m),r.label_basis,r.unit,r.source_url,r.verification_note,numeric(r.source_row),...months.map(m=>numeric(r[m+'_boxes']))]);
const packs=table('Packs','Historical presentation mapping',
  'Source: preserved 34-CIP mapping CSV. French product names are original source labels. Psyllium records are historical only.',
  ['CIP13','ATC5','Source product label','Units / box','mg / unit','Label mg / box','Boxes Jan–Jun','Ingredient basis','Unit','Recorded product source','Verification note','Source row',...months.map(m=>m+' boxes')],packRows,[23,14,66,18,18,21,23,38,18,85,85,17,23,23,23,23,23,23],105);
packs.getRange('A6:A39').setNumberFormat('0');
packs.getRange('D6:F39').setNumberFormat('#,##0.000');packs.getRange('G6:G39').setNumberFormat('#,##0');
packs.getRange('L6:R39').setNumberFormat('#,##0');
packs.getRange('D6:G39').format.horizontalAlignment='right';
packs.getRange('L6:R39').format.horizontalAlignment='right';

wb.recalculate();
const check=await wb.inspect({kind:'table',range:'Scope!A5:D15',include:'values',tableMaxRows:11,tableMaxCols:4,maxChars:1800});
console.log(check.ndjson);
const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:10},summary:'English view error scan',maxChars:1000});
console.log(errors.ndjson);
await fs.mkdir(outputDir,{recursive:true});
if(previewDir){
  await fs.mkdir(previewDir,{recursive:true});
  const ranges=[['Scope','A1:F15'],['Factors','A1:H10'],['Factors','I5:K8'],['Forecast','A1:I11'],['Forecast','J5:L10'],['Packs','A1:I10'],['Packs','J5:R8']];
  for(let i=0;i<ranges.length;i++){
    const [sheetName,range]=ranges[i];
    const img=await wb.render({sheetName,range,scale:1,format:'png'});
    await fs.writeFile(path.join(previewDir,`${i+1}_${sheetName}.png`),new Uint8Array(await img.arrayBuffer()));
  }
}
const file=await SpreadsheetFile.exportXlsx(wb);
await file.save(path.join(outputDir,'EthnoHack_Data_Review_EN.xlsx'));
console.log('English review workbook exported. Snapshot presentation; calculations remain in the Python pipeline.');
