"""EthnoHack: reproducible box-to-material conversion, standard-library only.

Reference mode is a conditional ideal mass balance, NOT a validated crop plan.
Planning mode requires explicit, documented parameters for every forecast ATC.
"""
import argparse, csv, datetime, math, pathlib

def number(value, label, *, positive=False):
    try: x=float(value)
    except (ValueError, TypeError): raise ValueError(f'{label}: missing or non-numeric')
    if not math.isfinite(x) or x<0 or (positive and x==0):
        raise ValueError(f'{label}: invalid value {value!r}')
    return x

def load_factors(path):
    with open(path,encoding='utf-8-sig',newline='') as f: rows=list(csv.DictReader(f))
    result={}
    for r in rows:
        k=r['atc5']
        if k in result:raise ValueError(f'Duplicate factor ATC: {k}')
        result[k]=r
    return result

def process(forecast_path, factors_path, start_month=None, mode='reference'):
    factors=load_factors(factors_path)
    with open(forecast_path,encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f);headers=reader.fieldnames or [];raw=list(reader)
    if len(headers)!=len(set(headers)):raise ValueError('Duplicate CSV column headers')
    if not raw:raise ValueError('Empty forecast')
    codes=[c for c in headers if c not in ('','source_index','month','date','Unnamed: 0')]
    if not codes:raise ValueError('No ATC columns')
    unknown=set(codes)-set(factors)
    if unknown:raise ValueError(f'Unknown ATC codes: {sorted(unknown)}')
    start=None
    if start_month:
        start=datetime.datetime.strptime(start_month,'%Y-%m').date()
    if not start and 'month' not in headers and 'date' not in headers:
        raise ValueError('CSV lacks dates: provide --start-month YYYY-MM explicitly')
    compiled={}
    for c in codes:
        p=factors[c]
        mg=number(p['mg_label_per_box'],c+' mg/box',positive=True)
        base=number(p['base_factor_reference'],c+' base factor',positive=True)
        potential=None
        if p['potential_api_kg_per_kg_material_reference'].strip():
            potential=number(p['potential_api_kg_per_kg_material_reference'],c+' potential',positive=True)
        eta=None;share=1
        if mode=='planning':
            if p['approved_for_planning']!='1':raise ValueError(c+': not approved for planning; review evidence, chemistry and material basis first')
            if not potential:raise ValueError(c+': missing material-to-API factor')
            eta=number(p['net_recovery'],c+' net_recovery',positive=True)
            share=number(p['plant_supply_share'],c+' plant_supply_share')
            if eta>1 or share>1:raise ValueError(c+': recovery/share must be <=1')
            if not p.get('planning_parameter_note','').strip():raise ValueError(c+': document parameter provenance/assumptions in planning_parameter_note')
        compiled[c]=(p,mg,base,potential,eta,share)
    result=[];seen_months=set()
    for i,r in enumerate(raw):
        if 'month' in headers or 'date' in headers:
            month=(r.get('month') or r.get('date') or '')[:7]
            datetime.datetime.strptime(month,'%Y-%m')
        else:
            total=start.year*12+start.month-1+i;month=f'{total//12:04d}-{total%12+1:02d}'
        if month in seen_months:raise ValueError('Duplicate month: '+month)
        seen_months.add(month)
        idx=r.get('source_index',r.get('',r.get('Unnamed: 0','')))
        for c in codes:
            p,mg,base,potential,eta,share=compiled[c]
            boxes=number(r[c],c+' forecast boxes')
            labelkg=boxes*mg/1_000_000;basekg=labelkg*base
            ideal=None if potential is None else basekg/potential
            demand=None if mode!='planning' else ideal*share/eta
            result.append(dict(month=month,source_index=idx,atc5=c,forecast_boxes=boxes,
                label_ingredient_kg=labelkg,label_basis=p['label_basis'],
                api_base_kg_reference=basekg,base_factor_status=p['base_factor_status'],
                plant=p['plant'],material_basis=p['material_basis'],
                material_kg_ideal_reference=ideal,planning_plant_kg=demand,
                status='PLANNING_SCENARIO' if mode=='planning' else 'REFERENCE_ONLY_NOT_VALIDATED_DEMAND'))
    return result

def write_csv(path, rows, fields=None):
    with open(path,'w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields or list(rows[0]));w.writeheader();w.writerows(rows)

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--forecast',required=True)
    ap.add_argument('--factors',default=str(pathlib.Path(__file__).with_name('conversion_factors_all_candidates.csv')))
    ap.add_argument('--start-month',help='Required for index-only CSV. Original Paterakis message: 2026-08.')
    ap.add_argument('--mode',choices=['reference','planning'],default='reference')
    ap.add_argument('--output-dir',required=True)
    a=ap.parse_args()
    try:rows=process(a.forecast,a.factors,a.start_month,a.mode)
    except (ValueError,KeyError) as e:ap.error(str(e))
    out=pathlib.Path(a.output_dir);out.mkdir(parents=True,exist_ok=True)
    write_csv(out/f'forecast_converted_{a.mode}.csv',rows)
    if a.mode=='planning':
        totals={};basis={}
        for r in rows:
            key=(r['month'],r['plant'])
            if r['plant'] in basis and basis[r['plant']]!=r['material_basis']:raise ValueError('Conflicting material bases for same plant ID')
            basis[r['plant']]=r['material_basis'];totals[key]=totals.get(key,0)+r['planning_plant_kg']
        write_csv(out/'demand_planning.csv',[dict(month=m,plant=p,demand_kg=v) for (m,p),v in sorted(totals.items())])
    print(f'{len(rows)} converted ATC-month rows, mode={a.mode}.')
    if a.mode=='reference':print('No final demand.csv created: ideal reference quantities require validated production parameters.')

if __name__=='__main__':main()
