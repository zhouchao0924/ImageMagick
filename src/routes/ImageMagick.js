/* eslint-disable no-await-in-loop */
const express = require('express');

const router = express.Router();

const shell = require('shelljs');

const fs = require('fs');

const path = require('path');

const request = require('request');

const RoomList = [{ RoomName: '客厅' }];

// 执行cmd命令
async function exec(cmd) {
  return new Promise((resolve) => {
    shell.exec(cmd, (code) => {
      resolve(code);
    });
  });
}

// 图片名称左边补0
function intToString(num, n) {
  let len = num.toString().length;
  while (len < n) {
    num = `0${num}`;
    len += 1;
  }
  return num;
}

// 循环多线程下载
async function DownLoadImage(FilePath) {
  // const FileName = `${intToString(i, 3)}.jpg`;
  const url = 'https://img15.ihomefnt.com/8781bab718cbee919584a0db4aabc1f1501ed3da29ca8fa50d8f0998263638a6.jpg!original';
  const stream = fs.createWriteStream(path.join(FilePath, 'image.jpg'));
  request(url).pipe(stream).on('close', () => {
    console.log('文件下载完毕');
  });
}

// 根据获取的参数循环执行cmd
async function magick(FilePath, ToPath) {
  for (let index = 0; index < 100; index += 1) {
    const Name = intToString(index, 3);
    // 平移镜头
    // const cmdstring = `magick ${FilePath}/image.jpg -crop 3840x2160+${index * 5}+0 ${ToPath}/${Name}.jpg`;
    const w = 1920 - index * 2;
    const h = w * 1080 / 1920;
    const cmdstring = `magick ${FilePath}/image.jpg -crop ${w}x${h}+${index * 1}+${index * 1} ${ToPath}/${Name}.jpg`;
    await exec(cmdstring);
  }
}

// 生成完图片后用ffmpeg生成视频
async function megreImage(FilePath, ToPath) {
  const cmdstring = 'ffmpeg -i ' + FilePath + '/%3d.jpg ' + ToPath + '/1.mp4';
  //const cmdstring = 'ffmpeg -i ' + FilePath + '/%3d.jpg -an -r 30 -filter:v "setpts=1*PTS" ' + ToPath + '/1.mp4';
  await exec(cmdstring);
}

// 创建文件夹目录
async function CreateSolutiondir(SolutionId, Room) {
  const RootPath = path.join(__dirname, 'ImageSpace');
  if (!fs.existsSync(RootPath)) {
    fs.mkdirSync(RootPath);
  }
  const SolutionDirPath = path.join(__dirname, `ImageSpace/${SolutionId}`);
  // 按空间创建文件夹
  for (let index = 0; index < Room.length; index += 1) {
    const SolutionRoomDirPath = path.join(SolutionDirPath, `${Room[index].RoomName}`);
    const SolutionImageDirPath = path.join(SolutionRoomDirPath, 'image');
    const SolutionVideoMp4DirPath = path.join(SolutionRoomDirPath, 'video');
    const SolutionVideoTsDirPath = path.join(SolutionRoomDirPath, 'ts');
    const SolutionVideoMp3DirPath = path.join(SolutionRoomDirPath, 'mp3');
    if (!fs.existsSync(SolutionDirPath)) {
      fs.mkdirSync(SolutionDirPath);
    }
    if (!fs.existsSync(SolutionRoomDirPath)) {
      fs.mkdirSync(SolutionRoomDirPath);
    }
    if (!fs.existsSync(SolutionImageDirPath)) {
      fs.mkdirSync(SolutionImageDirPath);
    }
    if (!fs.existsSync(SolutionVideoMp4DirPath)) {
      fs.mkdirSync(SolutionVideoMp4DirPath);
    }
    if (!fs.existsSync(SolutionVideoTsDirPath)) {
      fs.mkdirSync(SolutionVideoTsDirPath);
    }
    if (!fs.existsSync(SolutionVideoMp3DirPath)) {
      fs.mkdirSync(SolutionVideoMp3DirPath);
    }
    await DownLoadImage(SolutionRoomDirPath);
    await magick(SolutionRoomDirPath, SolutionImageDirPath);
    await megreImage(SolutionImageDirPath, SolutionVideoMp4DirPath);
  }
}

router.get('/ImageMagick', async (req, res) => {
  const create = await CreateSolutiondir('54781', RoomList);
  res.send({ create });
});

module.exports = router;
