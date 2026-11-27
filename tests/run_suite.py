"""Run all scoped browser regression groups. Nonzero on failure; never counts old logs."""
from pathlib import Path
import subprocess,sys,json,time,os
R=Path(__file__).resolve().parents[1];Q=R/'qa';Q.mkdir(exist_ok=True)
groups=[('browser_v04.py',x) for x in ['layout','appearance','storage-contract','flow','media']]+[('browser_v02.py',x) for x in ['privacy','recovery','receipt']]+[('browser_v05.py',x) for x in ['effects-ui','pixels','camera-errors','native-export','webcam-synthetic']]
groups += [('browser_v06.py',x) for x in ['settings','branches','timers','layout','webcam-guard']]
groups += [('browser_v07.py',x) for x in ['booth-cloud','guest','admin']]
groups += [('browser_v08.py',x) for x in ['printer-ui','native-flow','deadline-manual']]
groups += [('browser_v091_camera.py','probes'),('browser_v092_diagnostics.py','export'),('browser_v093_separated.py','independent-inputs'),('browser_v094_style_fit.py','modern-crt-layout'),('browser_v095_ticket_photo.py','countdown-photo-ticket'),('browser_v096_receipt_printer.py','receipt-print-ratios'),('browser_v099_antique_fps.py','antique-fps')]
results=[]
for script,group in groups:
 name=script.replace('.py','')+'-'+group;start=time.monotonic();log=Q/('final-'+name+'.log')
 print('RUN',name,flush=True)
 with log.open('w') as handle:
  try:cp=subprocess.run([sys.executable,str(R/'tests'/script)]+([] if script in ('browser_v091_camera.py','browser_v092_diagnostics.py','browser_v093_separated.py','browser_v094_style_fit.py','browser_v095_ticket_photo.py','browser_v096_receipt_printer.py','browser_v099_antique_fps.py') else ['--group',group]),cwd=R,stdout=handle,stderr=subprocess.STDOUT,timeout=240);code=cp.returncode
  except subprocess.TimeoutExpired:code=124;handle.write('\nTIMEOUT: not a pass.\n')
 text=log.read_text();import re
 matches=re.findall(r'TOTAL (\d+) PASSED',text);count=int(matches[-1]) if code==0 and matches else 0
 results.append({'name':name,'exit':code,'passed':count,'seconds':round(time.monotonic()-start,2),'log':str(log.relative_to(R))})
 print('EXIT',code,'PASS',count,flush=True)
 (Q/'suite-results.json').write_text(json.dumps({'completed':len(results),'planned':len(groups),'results':results,'passed_assertions':sum(x['passed'] for x in results),'all_passed':len(results)==len(groups) and all(x['exit']==0 for x in results),'scope':'Synthetic/mocked browser tests only; read per-group reports.'},indent=2)+'\n')
print('FINISHED',flush=True)
raise SystemExit(0 if all(x['exit']==0 for x in results) else 1)
