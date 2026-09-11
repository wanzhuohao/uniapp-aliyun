<template>
  <view class="page">
    <PageHeader title="数据中心" :show-grade="false" />
    <view class="grade-status"><text>{{ gradeStatus }}</text></view>
    <view v-if="recoveryRequired" class="card recovery"><text class="title">异常数据恢复</text><text class="desc">业务数据当前保持锁定。可先重试回滚；仅在确认不再需要本机学习记录时执行安全清空。</text><button class="primary" :disabled="busy||!exclusiveSupported" @click="retryRecovery">重试恢复</button><button class="danger" :disabled="busy||!exclusiveSupported" @click="confirmSafeClear">安全清空学习数据</button></view>
    <view class="card"><text class="title">完整学习数据备份</text><text class="desc">备份包含注册表内的本机学习记录。请妥善保管，文件可能包含答题数据。</text><button class="primary" :disabled="busy||!exclusiveSupported" @click="exportBackup">导出 JSON 备份</button><text v-if="!exclusiveSupported" class="warning">当前浏览器不支持 Web Locks，可靠备份与恢复已禁用；普通学习仍可使用。</text></view>
    <view class="card"><text class="title">恢复完整快照</text><text class="desc">恢复会覆盖注册表内全部学习数据；备份中缺失的 key 也会被删除。</text><button :disabled="busy||!exclusiveSupported" @click="chooseBackup">选择备份文件</button><view v-if="pending" class="preview"><text>生成时间：{{ pending.generatedAt }}</text><text>快照 key：{{ pending.snapshot.length }}</text><button class="danger" @click="confirmRestore">确认覆盖并恢复</button></view></view>
    <view class="card"><text class="title">脱敏诊断</text><text class="desc">只导出环境、受控错误码、存储 key 与字节数，不导出学习正文、答案或 URL 查询参数。</text><button @click="exportDiagnostics">导出诊断 JSON</button></view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import manifest from '../../manifest.json'
import { awaitLearningSession, getLearningSession } from '../../utils/common/learningSession.js'
import { createLearningBackup, validateLearningBackup, restoreLearningBackup, MAX_BACKUP_BYTES } from '../../utils/common/dataBackup.js'
import { buildDiagnosticReport, downloadDiagnosticReport, recordDiagnosticError } from '../../utils/common/diagnostics.js'
import { getLearningGradeLabel, openCourseGradeSession } from '../../utils/common/gradeContext.js'
const busy=ref(false),pending=ref(null),exclusiveSupported=ref(false),recoveryRequired=ref(false),gradeStatus=ref('正在读取年级状态…');let session
function downloadText(text,filename){if(!globalThis.Blob||!URL?.createObjectURL)throw new Error('DOWNLOAD_UNAVAILABLE');const blob=new Blob([text],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob);try{const link=document.createElement('a');link.href=url;link.download=filename;link.click()}finally{URL.revokeObjectURL(url)}}
async function exportBackup(){busy.value=true;try{const result=await session.runExclusiveBackup(context=>createLearningBackup(context));if(!result?.ok)throw new Error(result?.code||'BACKUP_RESTORE_FAILED');downloadText(result.text,`learning-backup-${result.backup.generatedAt.slice(0,10)}.json`);uni.showToast({title:'备份已生成',icon:'success'})}catch(error){recordDiagnosticError(error.message==='DOWNLOAD_UNAVAILABLE'?'DOWNLOAD_UNAVAILABLE':'BACKUP_RESTORE_FAILED','backup');uni.showModal({title:'备份失败',content:`${error.message||'生成失败'}。请关闭其他学习标签页并确认浏览器允许下载后重试。`,showCancel:false})}finally{busy.value=false}}
function chooseBackup(){const input=document.createElement('input');input.type='file';input.accept='application/json,.json';input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{if(file.size>MAX_BACKUP_BYTES)throw new Error('BACKUP_INVALID');pending.value=await validateLearningBackup(await file.text())}catch{recordDiagnosticError('BACKUP_INVALID','backup');uni.showModal({title:'备份不可用',content:'文件损坏、版本不匹配或超过 32 MiB。请选择本应用生成的完整备份。',showCancel:false})}};input.click()}
function modalConfirm(){return new Promise(resolve=>uni.showModal({title:'覆盖本机学习数据？',content:`备份生成于 ${pending.value.generatedAt}。恢复后页面会重新载入。`,confirmText:'仍要恢复',success:r=>resolve(!!r.confirm),fail:()=>resolve(false)}))}
async function confirmRestore(){if(!pending.value||!await modalConfirm())return;busy.value=true;try{const result=await session.runExclusiveRestore(context=>restoreLearningBackup(context,pending.value));if(!result?.ok)throw new Error(result?.code||'BACKUP_RESTORE_FAILED');pending.value=null;uni.showToast({title:'恢复成功',icon:'success'});setTimeout(()=>location.reload(),800)}catch(error){recordDiagnosticError('BACKUP_RESTORE_FAILED','backup');uni.showModal({title:'恢复未完成',content:`${error.message||'写入失败'}。原数据已尽力回滚，请关闭其他标签页后重试。`,showCancel:false});busy.value=false}}
function exportDiagnostics(){try{downloadDiagnosticReport(buildDiagnosticReport({appVersion:manifest.versionName}))}catch{recordDiagnosticError('DOWNLOAD_UNAVAILABLE','diagnostic');uni.showModal({title:'下载不可用',content:'浏览器未提供文件下载能力，请更换最新版 Chrome 后重试。',showCancel:false})}}
async function retryRecovery(){busy.value=true;try{const result=await session.retryRecovery();if(!result?.ok)throw new Error(result?.code||'BACKUP_RESTORE_FAILED');recoveryRequired.value=false;uni.showToast({title:'恢复成功',icon:'success'});setTimeout(()=>location.reload(),800)}catch(error){uni.showModal({title:'恢复仍未完成',content:`${error.message||'回滚失败'}。业务数据继续保持锁定。`,showCancel:false});busy.value=false}}
function confirmSafeClear(){uni.showModal({title:'永久删除本机学习记录？',content:'这会清空全部注册学习数据且无法撤销。仅在不再需要现有记录时继续。',confirmText:'永久清空',success:async result=>{if(!result.confirm)return;busy.value=true;try{const cleared=await session.safeClearRecovery();if(!cleared?.ok)throw new Error(cleared?.code||'BACKUP_RESTORE_FAILED');recoveryRequired.value=false;uni.showToast({title:'已清空',icon:'success'});setTimeout(()=>location.reload(),800)}catch(error){uni.showModal({title:'安全清空失败',content:`${error.message||'删除失败'}。业务数据继续保持锁定。`,showCancel:false});busy.value=false}}})}
onMounted(async()=>{session=getLearningSession();exclusiveSupported.value=!!session?.exclusiveDataOpsSupported;try{await awaitLearningSession();gradeStatus.value=`当前年级：${getLearningGradeLabel(openCourseGradeSession())}`}catch{gradeStatus.value='年级状态异常，可继续使用下方诊断或恢复功能'}recoveryRequired.value=session?.getState()==='recovery-required'})
</script>

<style scoped>
.page{min-height:100vh;background:#f5f7fa;padding-bottom:60rpx}.grade-status{margin:20rpx 32rpx 0;padding:18rpx 24rpx;border-radius:16rpx;background:#eef6ff;color:#2879bd;font-size:24rpx}.card{margin:24rpx 32rpx;padding:32rpx;background:#fff;border-radius:24rpx;box-shadow:0 5rpx 18rpx rgba(0,0,0,.05)}.title{display:block;font-size:32rpx;font-weight:bold;color:#243447}.desc,.warning,.preview text{display:block;margin:16rpx 0;color:#6b7280;line-height:1.7;font-size:24rpx}button{margin-top:20rpx}.primary{background:#2879bd;color:#fff}.danger{background:#c74343;color:#fff}.warning{color:#a65d00;background:#fff5dd;padding:18rpx;border-radius:12rpx}.preview{margin-top:22rpx;padding:20rpx;background:#f5f7fa;border-radius:14rpx}
</style>
