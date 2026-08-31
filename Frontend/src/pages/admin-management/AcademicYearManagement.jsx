import{useEffect,useMemo,useState}from'react';
import DashboardLayout from'../../layouts/DashboardLayout';
import TablePagination,{PAGE_SIZE}from'../../components/TablePagination';
import{academicYearApi}from'../../api/apiEndpoints';
import{FiCheckCircle,FiEye,FiEdit2,FiXCircle}from'react-icons/fi';
import'./AcademicYearManagement.css';

const DAY=864e5,states=['UPCOMING','ACTIVE','ARCHIVED'],blank={name:'',startDate:'',endDate:'',autoActivate:false};

const d=x=>{let z=new Date(`${x}T00:00:00`);
z.setHours(0,0,0,0);
return z},now=()=>{let z=new Date;
z.setHours(0,0,0,0);
return z},isPresentYear=x=>x?.startDate&&x?.endDate&&now()>=d(x.startDate)&&now()<=d(x.endDate),isPastYear=x=>x?.endDate&&now()>d(x.endDate),date=x=>d(x).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'}),days=x=>Math.ceil((d(x)-now())/DAY),duration=(a,b)=>Math.round((d(b)-d(a))/DAY)+1,progress=(a,b)=>Math.max(0,Math.min(100,Math.round((now()-d(a))*100/(d(b)-d(a))))),autoStatus=(a,b)=>now()<d(a)?'UPCOMING':now()>d(b)?'ARCHIVED':'ACTIVE';
const mapYear=x=>({id:String(x.academicYearId??x.id),name:x.academicYearName??x.name??'',startDate:String(x.startDate??'').slice(0,10),endDate:String(x.endDate??'').slice(0,10),status:x.isActive||Number(x.status)===1?'ACTIVE':Number(x.isArchived)===1?'ARCHIVED':autoStatus(String(x.startDate??'').slice(0,10),String(x.endDate??'').slice(0,10)),autoActivate:false});

export default function AcademicYear(){const[years,setYears]=useState([]),[search,setSearch]=useState(''),[filter,setFilter]=useState('ALL'),[modal,setModal]=useState(null),[selected,setSelected]=useState(null),[form,setForm]=useState(blank),[errors,setErrors]=useState({}),[notice,setNotice]=useState('Loading academic years...'),[activity,setActivity]=useState([]),[saving,setSaving]=useState(false),[page,setPage]=useState(1);
const close=()=>{setModal(null);
setSelected(null);
setErrors({})};
const loadYears=async()=>{try{const data=await academicYearApi.getAll();setYears(data.map(mapYear));setNotice(`${data.length} academic year${data.length===1?'':'s'} retrieved successfully.`)}catch(error){setNotice(error.message||'Unable to load academic years.')}};
useEffect(()=>{loadYears()},[]);
useEffect(()=>{
  const f=e=>e.key==='Escape'&&close();
  const htmlOverflow=document.documentElement.style.overflow;
  const bodyOverflow=document.body.style.overflow;
  const root=document.getElementById('root');
  const rootOverflow=root?.style.overflow;
  document.documentElement.style.overflow='auto';
  document.body.style.overflow='auto';
  if(root)root.style.overflow='visible';
  addEventListener('keydown',f);
  return()=>{
    removeEventListener('keydown',f);
    document.documentElement.style.overflow=htmlOverflow;
    document.body.style.overflow=bodyOverflow;
    if(root)root.style.overflow=rootOverflow;
  }
},[]);

const active=years.find(x=>x.status==='ACTIVE'||isPresentYear(x)),next=years.filter(x=>x.status==='UPCOMING').sort((a,b)=>a.startDate.localeCompare(b.startDate))[0],shown=useMemo(()=>years.filter(x=>`${x.name} ${x.status}`.toLowerCase().includes(search.toLowerCase().trim())&&(filter==='ALL'||x.status===filter)),[years,search,filter]),totalPages=Math.max(1,Math.ceil(shown.length/PAGE_SIZE)),currentPage=Math.min(page,totalPages),pageRows=shown.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE),count=s=>years.filter(x=>x.status===s).length,warnings=active?[days(active.endDate)<0?['danger','The active academic year has passed its end date.']:days(active.endDate)<7?['warning','Academic year is approaching closure.']:days(active.endDate)<30?['warning',`Academic year ends in ${days(active.endDate)} days.`]:['success','Academic year is operating normally.'],next?['info',`Next academic year ${next.name} is scheduled.`]:['warning','Next academic year is not configured.']]:[['warning','No active academic year is currently available.']];
useEffect(()=>setPage(1),[search,filter]);

const addActivity=(title,detail)=>setActivity(x=>[{title,detail,time:'Just now'},...x]);
const openAdd=()=>{setForm(blank);
setErrors({});
setModal('add')},edit=x=>{if(isPresentYear(x)){setNotice('Present academic year cannot be changed.');return}setSelected(x);
setForm({...x});
setErrors({});
setModal('edit')};
function validate(){let e={},others=years.filter(x=>x.id!==selected?.id);
if(!form.name.trim())e.name='Academic year is required.';
if(!form.startDate)e.startDate='Start date is required.';
if(!form.endDate)e.endDate='End date is required.';
if(form.startDate&&form.endDate&&d(form.endDate)<=d(form.startDate))e.endDate='End date must be after start date.';
if(form.name.trim()&&others.some(x=>x.name.toLowerCase()===form.name.trim().toLowerCase()))e.name='This academic year already exists.';
if(form.startDate&&form.endDate&&others.some(x=>d(form.startDate)<=d(x.endDate)&&d(form.endDate)>=d(x.startDate)))e.range='This date range overlaps an existing academic year.';
setErrors(e);
return!Object.keys(e).length}async function save(e){e.preventDefault();
if(selected&&isPresentYear(selected)){setErrors({form:'Present academic year cannot be changed.'});return}
if(!validate()||saving)return;
setSaving(true);
try{const data=selected?await academicYearApi.update(selected.id,form):await academicYearApi.create(form);const item=data?mapYear(data):{...form,id:selected?.id||Date.now().toString(),name:form.name.trim(),status:autoStatus(form.startDate,form.endDate)};setYears(x=>selected?x.map(y=>y.id===selected.id?item:y):[...x,item]);addActivity(selected?'Academic Year Updated':'Academic Year Created',item.name);setNotice(`${item.name} has been ${selected?'updated':'created'} successfully.`);close();await loadYears()}catch(error){setErrors({form:error.message||'Unable to save the academic year.'})}finally{setSaving(false)}}async function move(status){if(!selected||saving)return;
setSaving(true);
if(status==='ARCHIVED'&&isPresentYear(selected)){setNotice('Present academic year cannot be archived.');close();return}
if(status==='ARCHIVED'&&!isPastYear(selected)){setNotice('Archive option is available only for previous academic years.');close();return}
try{if(status==='ACTIVE')await academicYearApi.activate(selected.id);else await academicYearApi.deactivate(selected.id);addActivity(`Academic Year ${status==='ACTIVE'?'Activated':'Archived'}`,selected.name);setNotice(`${selected.name} has been ${status==='ACTIVE'?'activated':'archived'} successfully.`);close();await loadYears()}catch(error){setNotice(error.message||'Unable to update the academic year status.')}finally{setSaving(false)}}async function generate(){if(!active||saving)return;
let s=d(active.endDate);
s.setDate(s.getDate()+1);
let e=new Date(s);
e.setFullYear(e.getFullYear()+1);
e.setDate(e.getDate()-1);
let item={name:`${s.getFullYear()} - ${e.getFullYear()}`,startDate:s.toISOString().slice(0,10),endDate:e.toISOString().slice(0,10),status:'UPCOMING',autoActivate:false};
if(years.some(x=>x.name===item.name))setNotice(`${item.name} already exists, so no duplicate was created.`);
else{setSaving(true);try{await academicYearApi.create(item);addActivity('Next Academic Year Generated',item.name);setNotice(`${item.name} was generated successfully.`);await loadYears()}catch(error){setNotice(error.message||'Unable to generate the next academic year.')}finally{setSaving(false)}}close()}
const openView=async x=>{setSelected(x);setModal('view');try{const data=await academicYearApi.getById(x.id);if(data)setSelected(mapYear(data))}catch(error){setNotice(error.message||'Unable to load academic year details.')}};
const action=x=><div className="ay-actions"><button onClick={()=>openView(x)}><FiEye/> View</button><button onClick={()=>edit(x)} disabled={x.status==='ARCHIVED'||isPresentYear(x)}><FiEdit2/> Edit</button>{isPresentYear(x)&&<button className="current-action" disabled>Present Year</button>}{x.status==='ARCHIVED'&&<button className="archived-action" disabled>Archived</button>}{x.status==='UPCOMING'&&<button className="primary" onClick={()=>{setSelected(x);
setModal('activate')}}><FiCheckCircle/> Activate</button>}{isPastYear(x)&&x.status!=='ARCHIVED'&&<button className="danger" onClick={()=>{setSelected(x);
setModal('archive')}}><FiXCircle/> Archive</button>}</div>;

return <DashboardLayout><main className="ay"><header><div><p className="eyebrow">Academic Year Control Center</p><h1>Academic Year</h1><p>Manage academic cycles, lifecycle, and academic transitions.</p></div><div className="headerActions"><button onClick={()=>setModal('generate')}>Generate Next Year</button><button className="solid" onClick={openAdd}>+ Add Academic Year</button></div></header><p className="local" role="status">ⓘ {notice}</p>{active?<section className="hero"><div><p className="eyebrow">Active Academic Year</p><h2>{active.name}</h2><p>{date(active.startDate)} — {date(active.endDate)}</p><Badge s="ACTIVE"/></div><div className="metrics"><p><b>{Math.max(0,days(active.endDate))}</b>Days remaining</p><p><b>{progress(active.startDate,active.endDate)}%</b>Year progress</p></div><div className="bar"><span style={{width:`${progress(active.startDate,active.endDate)}%`}}/></div></section>:<section className="hero"><h2>No active academic year</h2><p>Activate an upcoming year to establish the active context.</p></section>}<section className="kpis">{[['Academic Years',years.length,'Configured locally'],['Active Year',count('ACTIVE'),'One allowed at a time'],['Upcoming Year',count('UPCOMING'),'Scheduled next cycles'],['Archived Years',count('ARCHIVED'),'Historical records']].map(x=><article key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><small>{x[2]}</small></article>)}</section><div className="grid"><Panel label="Lifecycle" title="Academic Year Lifecycle"><div className="life">{states.map((x,i)=><div key={x}><span className={count(x)?'on':''}>✓</span><b>{x}</b>{i<3&&<i>↓</i>}</div>)}</div><p className="muted">Lifecycle changes are limited to valid forward transitions in this demo.</p></Panel><Panel label="Smart Notifications" title="Academic Year Health"><div className="notices">{warnings.map((x,i)=><p className={x[0]} key={i}>{x[0]==='success'?'✓':x[0]==='info'?'ⓘ':'⚠'} {x[1]}</p>)}</div></Panel></div><Panel label="Academic Years" title="Cycle Register" wide><div className="tools"><input aria-label="Search academic years" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search year or status"/><div className="filters">{['ALL',...states].map(x=><button className={filter===x?'selected':''} onClick={()=>setFilter(x)} key={x}>{x[0]+x.slice(1).toLowerCase()}</button>)}</div></div><div className="table"><table><thead><tr>{['Academic Year','Start Date','End Date','Status','Duration','Auto Activation','Actions'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{pageRows.map(x=><tr key={x.id}><td data-label="Academic Year"><b>{x.name}</b></td><td data-label="Start Date">{date(x.startDate)}</td><td data-label="End Date">{date(x.endDate)}</td><td data-label="Status"><Badge s={x.status}/></td><td data-label="Duration">{duration(x.startDate,x.endDate)} days</td><td data-label="Auto Activation">{x.autoActivate?'Enabled':'Manual'}</td><td data-label="Actions">{action(x)}</td></tr>)}{!shown.length&&<tr><td colSpan="7">No academic years match your search or filter.</td></tr>}</tbody></table></div>{!!shown.length&&<TablePagination page={currentPage} totalPages={totalPages} onPageChange={setPage}/>}</Panel><div className="grid bottom"><Panel label="Demo Readiness" title="Academic Year Readiness"><Checks items={['✓ Academic year configured','✓ Date range valid',`${active?'✓':'⚠'} Active academic year available`,`${next?'✓':'⚠'} Next academic year configured`,'✓ Academic calendar ready']}/><p className="muted">UI/demo readiness indicators — not backend verification.</p></Panel><Panel label="Academic Year Transition" title="Rollover Preview"><div className="transition"><b>{active?.name||'No active year'}</b><span>↓</span><b>{next?.name||'Next year not configured'}</b></div><Checks items={['✓ Academic calendar','✓ Course configuration','✓ Semester structure','○ Student promotion','○ Fee configuration','○ Examination configuration']}/></Panel><Panel label="Local Activity" title="Activity Timeline"><ol>{activity.slice(0,4).map((x,i)=><li key={i}><span/><div><b>{x.title}</b><p>{x.detail}</p><small>{x.time}</small></div></li>)}</ol></Panel></div>{modal&&<Modal type={modal} selected={selected} active={active} form={form} setForm={setForm} errors={errors} close={close} save={save} generate={generate} move={move}/>}</main></DashboardLayout>}
function Badge({s}){return <span className={`badge ${s}`}>● {s}</span>}function Panel({label,title,children,wide}) {return <section className={`panel ${wide?'wide':''}`}><p className="eyebrow">{label}</p><h2>{title}</h2>{children}</section>}function Checks({items}){return <ul className="checks">{items.map(x=><li className={x[0]==='⚠'||x[0]==='○'?'warn':''} key={x}>{x}</li>)}</ul>}
function Modal({type,selected,active,form,setForm,errors,close,save,generate,move}){let formMode=type==='add'||type==='edit',title=formMode?(type==='add'?'Add':'Edit')+' Academic Year':type==='generate'?'Generate Next Academic Year?':type==='activate'?'Activate Academic Year?':type==='archive'?'Archive Academic Year?':'Academic Year Details',confirm=type==='generate'?`${active?.name} → proposed next cycle`:selected?.name,desc=type==='activate'?'Activating this academic year changes the active academic context.':type==='archive'?'Only previous academic years can be archived. Present year dates will stay unchanged.':'This will prepare the next annual cycle.';
return <div className="backdrop" onMouseDown={e=>e.target===e.currentTarget&&close()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="title"><button className="x" aria-label="Close dialog" onClick={close}>×</button><p className="eyebrow">Academic Year Control Center</p><h2 id="title">{title}</h2>{formMode?<form onSubmit={save} noValidate><label>Academic Year<input autoFocus value={form.name} onChange={e=>setForm(x=>({...x,name:e.target.value}))}/>{errors.name&&<em>{errors.name}</em>}</label><div className="formgrid"><label>Start Date<input type="date" value={form.startDate} onChange={e=>setForm(x=>({...x,startDate:e.target.value}))}/>{errors.startDate&&<em>{errors.startDate}</em>}</label><label>End Date<input type="date" value={form.endDate} onChange={e=>setForm(x=>({...x,endDate:e.target.value}))}/>{errors.endDate&&<em>{errors.endDate}</em>}</label></div>{errors.range&&<em>{errors.range}</em>}{errors.form&&<em>{errors.form}</em>}{type==='add'&&<label className="toggle"><input type="checkbox" checked={form.autoActivate} onChange={e=>setForm(x=>({...x,autoActivate:e.target.checked}))}/> Enable auto activation <small>Display preference only;
 no background automation runs.</small></label>}<footer><button type="button" onClick={close}>Cancel</button><button className="solid">{type==='add'?'Add Academic Year':'Save Changes'}</button></footer></form>:<><p className="confirm">{confirm}</p>{type==='view'?selected&&<div className="details"><p>Academic year <b>{selected.name}</b></p><p>Date range <b>{date(selected.startDate)} — {date(selected.endDate)}</b></p><p>Status <b>{selected.status}</b></p></div>:<p className="muted">{desc}</p>}<footer><button onClick={close}>Cancel</button><button className="solid" onClick={()=>type==='view'?close():type==='generate'?generate():move(type==='activate'?'ACTIVE':'ARCHIVED')}>{type==='view'?'Done':type==='generate'?'Generate Year':type==='activate'?'Activate':'Archive'}</button></footer></>}</section></div>}
