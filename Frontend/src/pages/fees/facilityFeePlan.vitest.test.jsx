import { afterEach, expect, test, vi } from 'vitest'
vi.mock('../../auth/auth', () => ({getUserCollegeId:()=>null,getUserRole:()=> 'admin',getAccessToken:()=> 'test-token',getAuthStorage:()=>localStorage,getRefreshToken:()=>null,signOut:vi.fn()}))
import { facilityFeePlanApi, studentAdmissionApi } from '../../api/apiEndpoints'
afterEach(()=>vi.unstubAllGlobals())
function reply(body){return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}})}
test('hostel creation sends college-scoped payload and uses server identity',async()=>{
 const fetcher=vi.fn(async()=>reply({success:true,id:12,data:{id:12,collegeId:9,status:'Active',data:{hostelName:'Campus',fee:20000}}}));vi.stubGlobal('fetch',fetcher)
 const saved=await facilityFeePlanApi.save('hostel',{collegeId:9,hostelName:'Campus',fee:20000,status:'Active'})
 expect(String(fetcher.mock.calls[0][0])).toContain('/api/v1/hostel-fees?collegeId=9')
 expect(fetcher.mock.calls[0][1].method).toBe('POST')
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({collegeId:9,fee:20000})
 expect(saved).toMatchObject({id:12,collegeId:9,hostelName:'Campus',status:'Active'})
})
test('transport list unwraps saved records',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>reply({success:true,data:[{id:5,collegeId:9,status:'Draft',data:{route:'North'}}]})))
 expect(await facilityFeePlanApi.list('transport',9)).toEqual([{id:5,collegeId:9,status:'Draft',route:'North'}])
})
test('a response without a saved id cannot report success',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>reply({success:true,data:{}})))
 await expect(facilityFeePlanApi.save('hostel',{collegeId:9})).rejects.toThrow('saved fee plan ID')
})




test('admission edit sends current form scope instead of stale root IDs',async()=>{
 const fetcher=vi.fn(async()=>reply({success:true,data:{admissionId:82}}));vi.stubGlobal('fetch',fetcher)
 await studentAdmissionApi.update(82,{collegeId:99,academicYearId:99,courseId:99,branchId:99,semesterId:99,sectionId:99,admission:{collegeId:9},academic:{academicYearId:'1',courseId:'2',branchId:'3',semesterId:'4',sectionId:''}})
 const body=JSON.parse(fetcher.mock.calls[0][1].body)
 expect(body).toMatchObject({collegeId:9,academicYearId:1,courseId:2,branchId:3,semesterId:4})
 expect(body.sectionId).not.toBe(99)
})

test('personal admission save preserves dedicated saved academic mapping',async()=>{
 const fetcher=vi.fn(async(url,options={})=>{
   if(options.method==='PUT') return reply({success:true,data:{admissionId:81}})
   if(String(url).includes('/academic-details')) return reply({success:true,data:{collegeId:9,courseId:12,branchId:13,semesterId:14,academicYearId:15}})
   return reply({success:true,data:{admissionId:81,collegeId:9,courseId:99,branchId:99,semesterId:99,academicYearId:99}})
 });vi.stubGlobal('fetch',fetcher)
 await studentAdmissionApi.update(81,{personal:{firstName:'Updated'},admission:{collegeId:9},academic:{courseId:88,branchId:88,semesterId:88,academicYearId:88}},{preserveAcademicMapping:true})
 const call=fetcher.mock.calls.find(([,options])=>options.method==='PUT')
 expect(JSON.parse(call[1].body)).toMatchObject({firstName:'Updated',courseId:12,branchId:13,semesterId:14,academicYearId:15})
})

test('empty saved academic columns do not erase selected program branch and semester',async()=>{
 const fetcher=vi.fn(async(url,options={})=>{
   if(options.method==='PUT') return reply({success:true,data:{admissionId:81}})
   return reply({success:true,data:{admissionId:81,collegeId:119,academicYearId:72,departmentId:null,courseId:null,branchId:0,semesterId:'',formData:{academic:{courseId:null,branchId:null,semesterId:null}}}})
 });vi.stubGlobal('fetch',fetcher)
 await studentAdmissionApi.update(81,{admission:{collegeId:119},academic:{academicYearId:72,courseId:'12',branchId:'13',semesterId:'14'}},{preserveAcademicMapping:true})
 const call=fetcher.mock.calls.find(([,options])=>options.method==='PUT')
 expect(JSON.parse(call[1].body)).toMatchObject({collegeId:119,academicYearId:72,courseId:12,branchId:13,semesterId:14})
})
