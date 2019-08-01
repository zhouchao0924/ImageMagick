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

// 生成完图片后用ffmpeg生成视频
async function megreImage(FilePath, ToPath) {
  const cmdstring = 'ffmpeg -i ' + FilePath + '/%3d.jpg ' + ToPath + '/1.mp4';
  //const cmdstring = 'ffmpeg -i ' + FilePath + '/%3d.jpg -an -r 30 -filter:v "setpts=1*PTS" ' + ToPath + '/1.mp4';
  await exec(cmdstring);
}

// 获取图片尺寸大小
async function getimagesize(FilePath, SolutionImageDirPath, SolutionVideoMp4DirPath) {
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
  await megreImage(SolutionImageDirPath, SolutionVideoMp4DirPath);
}

async function ImagemagickInit(SolutionId, Room) {
  const SolutionDirPath = path.join(__dirname, `ImageSpace/${SolutionId}`);
  // 按空间文件夹处理图片
  for (let index = 0; index < Room.length; index += 1) {
    const SolutionRoomDirPath = path.join(SolutionDirPath, `${Room[index].roomId}`);
    const SolutionImageDirPath = path.join(SolutionRoomDirPath, 'image');
    const SolutionVideoMp4DirPath = path.join(SolutionRoomDirPath, 'video');
    const cmdstring = `magick ${SolutionRoomDirPath}/image.png magick ${SolutionRoomDirPath}/image.jpg`;
    await exec(cmdstring);
    await getimagesize(`${SolutionRoomDirPath}/image.jpg`, SolutionImageDirPath, SolutionVideoMp4DirPath);
  }
}

// 循环多线程下载
function DownLoadImage(SolutionId, FilePath, Room, index) {
  const stream = fs.createWriteStream(path.join(FilePath, 'image.png'));
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
      ImagemagickInit(SolutionId, Room);// 图片下载完成，开始处理图片
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
    DownLoadImage(SolutionId, SolutionRoomDirPath, Room, index);// 下载图片
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
      "success": true,
      "msg": null,
      "data": {
        "solutionId": 49119,
        "images": [
          {
            "roomId": 11763,
            "roomName": "客厅",
            "usageId": 1,
            "imageUrlList": [
              "https://ihome-test.oss-cn-shanghai.aliyuncs.com/623845e0a72549868702ec8778566254e1a9b47beaae94a0546f15ed04e4ca72.png",
              "https://ihome-test.oss-cn-shanghai.aliyuncs.com/a6f2bb749ad0b4bffdf7d95bfd822bd7bd2e4b028faa73b2e60586a6f705b69c.png"
            ]
          },
          {
            "roomId": 11764,
            "roomName": "餐厅",
            "usageId": 6,
            "imageUrlList": [
              "https://ihome-test.oss-cn-shanghai.aliyuncs.com/843de75b8ec646318871cba871a294fa59ea2afe9938717c715fd7e55a78f585.png"
            ]
          },
          {
            "roomId": 11765,
            "roomName": "主卧",
            "usageId": 2,
            "imageUrlList": [
              "https://ihome-test.oss-cn-shanghai.aliyuncs.com/b0c91da1960f6f7206a5a3ee4008e083894354e27dae758c4dc8781737eb9ffa.png"
            ]
          },
          {
            "roomId": 11766,
            "roomName": "次卧",
            "usageId": 3,
            "imageUrlList": [
              "https://ihome-test.oss-cn-shanghai.aliyuncs.com/468142b9a4312b7d065ca36ed43a442b304809e053a47db901bebca3beafb9ea.png"
            ]
          },
          {
            "roomId": 11768,
            "roomName": "厨房",
            "usageId": 8,
            "imageUrlList": [
              "https://ihome-test.oss-cn-shanghai.aliyuncs.com/73c879e21c4600fe86b90b90782c9b2eb564be5f0b2982a5e751f5e169eadac1.png"
            ]
          },
          {
            "roomId": 11769,
            "roomName": "主卫",
            "usageId": 18,
            "imageUrlList": [
              "https://ihome-test.oss-cn-shanghai.aliyuncs.com/440289aea7e27e407c6b4483e56888d53e25b50a16045321e355a046776f46d9.png"
            ]
          },
          {
            "roomId": 11771,
            "roomName": "生活阳台-4",
            "usageId": 10,
            "imageUrlList": [
              "https://ihome-test.oss-cn-shanghai.aliyuncs.com/80745c70da211a2601c651e97654293ce7481451ebb65c6ee2aef9d9b3362853.png",
              "https://ihome-test.oss-cn-shanghai.aliyuncs.com/d57e5ec1b4bde0678e1ae8f3bd83aa17e8e61fe38d89e81e1e012475974ebfe6.png"
            ]
          }
        ]
      }
    }
    HasDownLoadNum = 0;
    CreateSolutiondir(obj.data.solutionId, obj.data.images);
  }).on('error', (e) => {
    console.log(`error:${e.message}`);
  });
});
requ.write(prams);
requ.end();

module.exports = router;
