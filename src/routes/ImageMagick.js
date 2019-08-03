/* eslint-disable no-await-in-loop */
const express = require('express');

const router = express.Router();

const shell = require('shelljs');

const fs = require('fs');

const path = require('path');

const request = require('request');

const http = require('http');

let CurrentImageSizeW;
let CurrentImageSizeh;
let HasDownLoadNum;
let HasTsNum;
let tspath;

// 执行cmd命令
async function exec(cmd) {
  return new Promise((resolve) => {
    shell.exec(cmd, (code, stdout) => {
      resolve(code, stdout);
      if (stdout) {
        const SizeArray = stdout.split('x');
        CurrentImageSizeW = Number(SizeArray[0]);
        CurrentImageSizeh = Number(SizeArray[1]);
      }
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

// 根据获取的参数循环执行cmd
// 平移效果
async function magicktranslation(FilePath, ToPath, w, h) {
  for (let index = 0; index < 200; index += 1) {
    const Name = intToString(index, 3);
    const cw = h / 2;
    const cmdstring = `magick ${FilePath} -crop ${cw}x${h}+${w / 2 - 500 + index * 5}+0 ${ToPath}/${Name}.jpg`;
    await exec(cmdstring);
  }
}

// 拉近效果
async function magickdrawnear(FilePath, ToPath, w, h) {
  for (let index = 0; index < 100; index += 1) {
    const Name = intToString(index, 3);
    const ch = h - index * 2;
    const cw = ch / 2;
    const cmdstring = `magick ${FilePath} -crop ${cw}x${ch}+${w / 2 - h / 4 + index * 1}+${index * 1} ${ToPath}/${Name}.jpg`;
    await exec(cmdstring);
  }
}

async function concatTS(SolutionId, SolutionDirPath) {
  const RootPath = path.join(__dirname, 'ImageSpace');
  const cmdstring = `ffmpeg -i "concat:${tspath}${RootPath}/over.ts" -acodec copy -vcodec copy -absf aac_adtstoasc ${SolutionDirPath}/${SolutionId}.mp4`;
  await exec(cmdstring);
}

// 生成完图片后用ffmpeg生成视频
async function megreImage(FilePath, ToPath, TsDirPath, Mp3DirPath, Roomid, SolutionId, SolutionDirPath) {
  const cmdstring = `ffmpeg -i ${FilePath}/%3d.jpg ${ToPath}/1.mp4`;
  await exec(cmdstring);
  const cmdstring1 = `ffmpeg -i ${ToPath}/1.mp4 -vf fade=in:0:20 ${ToPath}/2.mp4`;
  await exec(cmdstring1);
  const cmdstring2 = `ffmpeg -i ${ToPath}/2.mp4 -vf fade=out:80:20 ${ToPath}/3.mp4`;
  await exec(cmdstring2);
  const cmdstring3 = `ffmpeg -i ${ToPath}/3.mp4 -vcodec copy -acodec copy -vbsf h264_mp4toannexb ${TsDirPath}/${Roomid}.ts`;
  await exec(cmdstring3);
  tspath = `${tspath}${TsDirPath}/${Roomid}.ts|`;
  HasTsNum += 1;
  if (HasTsNum === HasDownLoadNum) {
    await concatTS(SolutionId, SolutionDirPath);
  }
}

// 获取图片尺寸大小
async function getimagesize(FilePath, SolutionImageDirPath, SolutionVideoMp4DirPath, TsDirPath, Mp3DirPath, Roomid, SolutionId, SolutionDirPath) {
  const cmdstring = `magick identify -format "%wx%h" ${FilePath}`;
  await exec(cmdstring);
  if (CurrentImageSizeW === 2560 && CurrentImageSizeh === 1440) {
    await magicktranslation(FilePath, SolutionImageDirPath, CurrentImageSizeW, CurrentImageSizeh);// 2k平移效果16:9
  }
  if (CurrentImageSizeW === 1920 && CurrentImageSizeh === 1080) {
    await magickdrawnear(FilePath, SolutionImageDirPath, CurrentImageSizeW, CurrentImageSizeh);// 2k拉近效果4:3
  }
  if (CurrentImageSizeW === 1080 && CurrentImageSizeh === 1440) {
    await magickdrawnear(FilePath, SolutionImageDirPath, CurrentImageSizeW, CurrentImageSizeh);// 2k拉近效果3:4
  }
  if (CurrentImageSizeW === 3840 && CurrentImageSizeh === 2160) {
    await magicktranslation(FilePath, SolutionImageDirPath, CurrentImageSizeW, CurrentImageSizeh);// 4k平移效果16:9
  }
  if (CurrentImageSizeW === 2880 && CurrentImageSizeh === 2160) {
    await magickdrawnear(FilePath, SolutionImageDirPath, CurrentImageSizeW, CurrentImageSizeh);// 4k拉近效果4:3
  }
  if (CurrentImageSizeW === 1620 && CurrentImageSizeh === 2160) {
    await magickdrawnear(FilePath, SolutionImageDirPath, CurrentImageSizeW, CurrentImageSizeh);// 4k拉近效果3:4
  }
  await megreImage(SolutionImageDirPath, SolutionVideoMp4DirPath, TsDirPath, Mp3DirPath, Roomid, SolutionId, SolutionDirPath);
}

async function ImagemagickInit(SolutionId, Room, TsDirPath, Mp3DirPath) {
  const SolutionDirPath = path.join(__dirname, `ImageSpace/${SolutionId}`);
  // 按空间文件夹处理图片
  for (let index = 0; index < Room.length; index += 1) {
    const SolutionRoomDirPath = path.join(SolutionDirPath, `${Room[index].roomId}`);
    const SolutionImageDirPath = path.join(SolutionRoomDirPath, 'image');
    const SolutionVideoMp4DirPath = path.join(SolutionRoomDirPath, 'video');
    await getimagesize(`${SolutionRoomDirPath}/image.jpg`, SolutionImageDirPath, SolutionVideoMp4DirPath, TsDirPath, Mp3DirPath, `${Room[index].roomId}`, SolutionId, SolutionDirPath);
  }
}

// 循环多线程下载
function DownLoadImage(SolutionId, FilePath, Room, index, TsDirPath, Mp3DirPath) {
  const stream = fs.createWriteStream(path.join(FilePath, 'image.jpg'));
  request(`${Room[index].imageUrlList[0]}!original`).pipe(stream).on('close', () => {
    console.log('文件下载完毕');
    HasDownLoadNum += 1;
    const SolutionImageDirPath = path.join(FilePath, 'image');
    const SolutionVideoMp4DirPath = path.join(FilePath, 'video');
    if (!fs.existsSync(SolutionImageDirPath)) {
      fs.mkdirSync(SolutionImageDirPath);
    }
    if (!fs.existsSync(SolutionVideoMp4DirPath)) {
      fs.mkdirSync(SolutionVideoMp4DirPath);
    }
    if (HasDownLoadNum === Room.length) {
      ImagemagickInit(SolutionId, Room, TsDirPath, Mp3DirPath);// 图片下载完成，开始处理图片
    }
  });
}

// 创建文件夹目录
function CreateSolutiondir(SolutionId, Room) {
  const RootPath = path.join(__dirname, 'ImageSpace');
  if (!fs.existsSync(RootPath)) {
    fs.mkdirSync(RootPath);
  }
  const SolutionDirPath = path.join(__dirname, `ImageSpace/${SolutionId}`);
  // 按空间创建文件夹
  for (let index = 0; index < Room.length; index += 1) {
    const SolutionRoomDirPath = path.join(SolutionDirPath, `${Room[index].roomId}`);
    const SolutionVideoTsDirPath = path.join(SolutionDirPath, 'ts');
    const SolutionVideoMp3DirPath = path.join(SolutionDirPath, 'mp3');
    if (!fs.existsSync(SolutionDirPath)) {
      fs.mkdirSync(SolutionDirPath);
    }
    if (!fs.existsSync(SolutionRoomDirPath)) {
      fs.mkdirSync(SolutionRoomDirPath);
    }
    if (!fs.existsSync(SolutionVideoTsDirPath)) {
      fs.mkdirSync(SolutionVideoTsDirPath);
    }
    if (!fs.existsSync(SolutionVideoMp3DirPath)) {
      fs.mkdirSync(SolutionVideoMp3DirPath);
    }
    DownLoadImage(SolutionId, SolutionRoomDirPath, Room, index, SolutionVideoTsDirPath, SolutionVideoMp3DirPath);// 下载图片
  }
}

const prams = JSON.stringify({ ip: '192.168.1.1' });

const options = {
  host: 'irayproxy.sit.ihomefnt.org',
  port: '80',
  method: 'POST',
  path: '/popVideoJob',
  headers: {
    'Content-Type': 'application/json'
  }
};

let body = '';
const requ = http.request(options, (res) => {
  res.on('data', (data) => {
    body += data;
  }).on('end', () => {
    // const obj = JSON.parse(body);
    // if (obj.success) {
    //   if (obj.data) {
    //     CreateSolutiondir(obj.data.solutionId, obj.data.images);
    //   }
    // }
    const obj = {
      'success': true,
      'msg': null,
      'data': {
        'solutionId': 49119,
        'images': [
          {
            'roomId': 11763,
            'roomName': '客厅',
            'usageId': 1,
            'imageUrlList': [
              'https://img15.ihomefnt.com/8781bab718cbee919584a0db4aabc1f1501ed3da29ca8fa50d8f0998263638a6.jpg'
            ]
          }, {
            'roomId': 11764,
            'roomName': '餐厅厅',
            'usageId': 1,
            'imageUrlList': [
              'https://img15.ihomefnt.com/8781bab718cbee919584a0db4aabc1f1501ed3da29ca8fa50d8f0998263638a6.jpg'
            ]
          }
        ]
      }
    }
    HasDownLoadNum = 0;
    HasTsNum = 0;
    tspath = '';
    CreateSolutiondir(obj.data.solutionId, obj.data.images);
  }).on('error', (e) => {
    console.log(`error:${e.message}`);
  });
});
requ.write(prams);
requ.end();

module.exports = router;
