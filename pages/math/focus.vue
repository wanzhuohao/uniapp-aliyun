<template>
  <view class="page"><PageHeader title="数学专注" /><view v-if="question" class="question-card"><text class="counter">{{ index+1 }}/{{ questions.length }}</text><text class="expr">{{ question.expr }}</text><view v-if="question.type==='compare'" class="options"><view v-for="symbol in ['＜','＝','＞']" :key="symbol" :class="['opt',question.userAnswer===symbol&&'active']" @click="question.userAnswer=symbol">{{ symbol }}</view></view><input v-else class="input" :value="question.userAnswer" placeholder="答案" @input="question.userAnswer=$event.detail.value" /></view><view class="nav"><button :disabled="index===0" @click="index--">上一题</button><button v-if="index<questions.length-1" @click="index++">下一题</button><button v-else class="primary" :disabled="submitted||busy" @click="submit">交卷</button></view><button class="exit" @click="exit">退出专注</button></view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { generateQuestions, checkAnswer } from '../../utils/math/questionEngine.js'
import { buildFocusSubmissionTarget, createFocusSubmissionIntent } from '../../utils/math/mathStorage.js'
import { createPaperInstanceId } from '../../utils/common/paperEngine.js'
import { applyRegisteredSnapshotTransaction } from '../../utils/common/dataBackup.js'
import { awaitLearningSession, getLearningSession } from '../../utils/common/learningSession.js'
import { openCourseGradeSession } from '../../utils/common/gradeContext.js'
const questions=ref([]),index=ref(0),submitted=ref(false),busy=ref(false),question=computed(()=>questions.value[index.value])
let session,sessionGrade,focusInstanceId,frozenIntent
onMounted(async()=>{try{await awaitLearningSession();sessionGrade=openCourseGradeSession();session=getLearningSession();focusInstanceId=createPaperInstanceId();questions.value=generateQuestions({grade:sessionGrade,level:2,count:15,questionType:['add','sub','compare','fill']}).map(q=>({...q,userAnswer:''}))}catch{uni.showModal({title:'年级不可用',content:'请返回学习首页修复当前年级',showCancel:false})}})
async function submit(){if(submitted.value||busy.value)return;busy.value=true;try{if(!frozenIntent)frozenIntent=await createFocusSubmissionIntent({grade:sessionGrade,focusInstanceId,answers:questions.value.map(item=>({expr:item.expr,answer:item.answer,type:item.type,userAnswer:item.userAnswer,correct:checkAnswer(item)}))});const result=await session.runPaperMutation(context=>applyRegisteredSnapshotTransaction(context,original=>buildFocusSubmissionTarget(original,frozenIntent),'paper',{sessionGrade}));if(!result?.ok)throw new Error(result?.code||'PAPER_SUBMISSION_INCONSISTENT');const correct=frozenIntent.answers.filter(item=>item.correct).length;submitted.value=true;uni.showModal({title:'专注完成',content:`答对 ${correct}/${questions.value.length} 题`,showCancel:false,success:()=>uni.navigateBack()})}catch(error){const committed=error?.committed===true;uni.showModal({title:committed?'专注记录已保存':'专注记录未保存',content:committed?'记录已保存，但存储状态需要恢复。请按页面提示完成恢复，恢复前不要重复交卷。':`${error.message||'本机存储不可用'}。请勿刷新，可关闭其他学习标签页或清理空间后重试同一次交卷。`,showCancel:false})}finally{busy.value=false}}
function exit(){if(submitted.value){uni.navigateBack();return}uni.showModal({title:'退出专注',content:'当前进度不会保存，确定退出？',success:r=>{if(r.confirm)uni.navigateBack()}})}
</script>

<style scoped>
.page{min-height:100vh;background:#eef5fb}.question-card{margin:80rpx 32rpx 36rpx;padding:64rpx 32rpx;background:#fff;border-radius:28rpx;text-align:center;box-shadow:0 8rpx 28rpx rgba(30,90,142,.1)}.counter{display:block;color:#6b88a3}.expr{display:block;margin:70rpx 0;font-size:62rpx;font-weight:bold;font-family:monospace}.input{height:100rpx;border-bottom:4rpx solid #42a5f5;text-align:center;font-size:48rpx}.options,.nav{display:flex;justify-content:center;gap:18rpx}.opt{padding:22rpx 34rpx;border:2rpx solid #b9d1e5;border-radius:14rpx}.opt.active,.primary{background:#2b7fc2;color:#fff}.nav{margin:0 32rpx}.nav button{flex:1}.exit{margin-top:42rpx;color:#a62d33;background:transparent}
</style>
