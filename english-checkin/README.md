# 英语天天打卡

面向使用人教版 PEP（三年级起点）六年级上册**新版**教材的学生。学生可以按学校进度选择单元，每天完成单词、阅读和朗读三项练习后打卡，查看连续天数和历史记录。

六个单元为 Amazing places、Getting together、Healthy life、Managing money well、Exploring space、Energy, nature and us。每单元有两套围绕主题编写的原创练习，按日期轮换。单词和阅读由选择题判定；朗读由学生自行确认，没有录音或自动评分。

## 在手机上预览

1. 用电脑安装并打开[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 导入本目录 `english-checkin`。开发测试可使用测试 AppID；正式使用前，将 `project.config.json` 中的 `touristappid` 换成自己的小程序 AppID。
3. 点击开发者工具里的“预览”，用手机微信扫描二维码，就可以在手机上试用。
4. 面向其他用户使用时，在开发者工具中上传版本，并在微信小程序后台提交审核、发布。

课程进度、打卡记录保存在当前手机的微信本地存储中。更换手机或清除小程序数据后不会自动同步。这个项目不需要服务器，也没有账号、排行榜或语音识别。

## 本地检查

在本目录执行 `node --test tests/*.test.cjs`。测试覆盖日期轮换、连续天数、课程数据结构和打卡流程。完整界面仍需在微信开发者工具中预览检查。
