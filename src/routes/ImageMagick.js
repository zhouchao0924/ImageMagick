/* eslint-disable no-await-in-loop */
const express = require('express');

const router = express.Router();

const shell = require('shelljs');

const fs = require('fs');

const path = require('path');

const request = require('request');

const http = require('http');

const agileLog = require('agile-log');

const os = require('os');

const log = agileLog.getLogger('app');

let CurrentImageSizeW;
let CurrentImageSizeh;
let HasDownLoadNum;
let HasTsNum;
let tspath;
let translation;
let near;
let far;
let IsMaking;
let delpath;
let ipgetIPAdress;

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

// 删除文件夹
function deleteFolder(solutionpath) {
  let files = [];
  if (fs.existsSync(solutionpath)) {
    files = fs.readdirSync(solutionpath);
    files.forEach((file) => {
      const curPath = `${solutionpath}/${file}`;
      if (fs.statSync(curPath).isDirectory()) { // recurse
        deleteFolder(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(solutionpath);
  }
}

// 完成和失败都要做的错误处理
function complete() {
  deleteFolder(delpath);
  setTimeout(() => { IsMaking = false; }, 10000);
}

// 上传完成后，给后台的回执
function callback(SolutionId, url) {
  const requestData = JSON.stringify({
    message: '视频制作完成',
    solutionId: SolutionId,
    success: true,
    videoUrl: url
  });
  const options = {
    host: 'irayproxy.sit.ihomefnt.org',
    port: '80',
    method: 'POST',
    path: '/collectVideoResult',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  let abody = '';
  const req = http.request(options, (res) => {
    res.on('data', (data) => {
      abody += data;
    }).on('end', () => {
      const dataobj = JSON.parse(abody);
      if (dataobj.success) {
        log.info(`${SolutionId}任务结束,上传回执完成`);
        complete();
      } else {
        complete();
      }
    }).on('error', () => {
      complete();
    });
  });
  req.write(requestData);
  req.end();
}

// 上传视频
function UploadMP4(FilePath, SolutionId) {
  let sbody = '';
  const upload = request.post('https://unify-file.ihomefnt.com/unifyfile/file/drGeneralUpload');
  upload.setHeader('content-type', 'multipart/form-data');
  const form = upload.form();
  form.append('file', fs.createReadStream(`${FilePath}`));

  upload.on('data', (data) => {
    sbody += data;
  }).on('end', () => {
    const obj = JSON.parse(sbody);
    if (obj.success) {
      log.info(`${SolutionId}任务视频上传完成`);
      callback(SolutionId, obj.data);
    } else {
      complete();
    }
  }).on('error', () => {
    complete();
  });
}

// 根据获取的参数循环执行cmd
// 平移效果
async function magicktranslation(FilePath, ToPath, w, h) {
  for (let index = 0; index < 150; index += 1) {
    const Name = intToString(index, 3);
    const cw = h / 2;
    const cmdstring = `magick ${FilePath} -crop ${cw}x${h}+${w / 2 - 375 + index * 5}+0 ${ToPath}/${Name}.jpg`;
    await exec(cmdstring);
  }
}

// 拉近效果
async function magickdrawnear(FilePath, ToPath, w, h) {
  for (let index = 0; index < 150; index += 1) {
    const Name = intToString(index, 3);
    const ch = h - index * 2;
    const cw = ch / 2;
    const cmdstring = `magick ${FilePath} -crop ${cw}x${ch}+${w / 2 - h / 4 + index * 1}+${index * 1} ${ToPath}/${Name}.jpg`;
    await exec(cmdstring);
  }
}

// 拉远效果
async function magickdrawfar(FilePath, ToPath, w, h) {
  for (let index = 0; index < 150; index += 1) {
    const Name = intToString(index, 3);
    const ch = h - (149 - index) * 2;
    const cw = ch / 2;
    const cmdstring = `magick ${FilePath} -crop ${cw}x${ch}+${w / 2 - h / 4 - (149 - index) * 1}+${(149 - index) * 1} -resize ${h / 2}x${h} ${ToPath}/${Name}.jpg`;
    await exec(cmdstring);
  }
}

// 添加音乐和水印
async function AddMusic(time, RootPath, SolutionDirPath, SolutionId) {
  const cmdstring = `ffmpeg -i ${RootPath}/Music.mp3 -ss 00:00:25 -t 00:00:${time} -acodec copy ${SolutionDirPath}/mp3/${SolutionId}.mp3`;
  await exec(cmdstring);
  const cmdstring1 = `ffmpeg -i ${SolutionDirPath}/${SolutionId}.mp4 -i ${SolutionDirPath}/mp3/${SolutionId}.mp3 -c:v copy -c:a aac -strict experimental ${SolutionDirPath}/${SolutionId}-output.mp4`;
  await exec(cmdstring1);
  const cmdstring2 = `ffmpeg -i ${SolutionDirPath}/${SolutionId}-output.mp4 -ignore_loop 0 -i ${RootPath}/logo.gif -filter_complex "[0:v][1:v]overlay=10:10:shortest=1" ${SolutionDirPath}/${SolutionId}-v.mp4`;
  await exec(cmdstring2);
  UploadMP4(`${SolutionDirPath}/${SolutionId}-v.mp4`, SolutionId);
}

// 连接各个TS文件
async function concatTS(SolutionId, SolutionDirPath, time) {
  const RootPath = path.join(__dirname, 'ImageSpace');
  const cmdstring = `ffmpeg -i "concat:${tspath}${RootPath}/over.ts" -acodec copy -vcodec copy -absf aac_adtstoasc ${SolutionDirPath}/${SolutionId}.mp4`;
  await exec(cmdstring);
  AddMusic(time, RootPath, SolutionDirPath, SolutionId);
}

// 生成完图片后用ffmpeg生成视频
async function megreImage(FilePath, ToPath, TsDirPath, Mp3DirPath, Roomid, SolutionId, SolutionDirPath) { // eslint-disable-line
  const cmdstring = `ffmpeg -i ${FilePath}/%3d.jpg ${ToPath}/1.mp4`;
  await exec(cmdstring);
  if (HasTsNum === 0) {
    const cmdstring2 = `ffmpeg -i ${ToPath}/1.mp4 -vf fade=out:130:20 ${ToPath}/3.mp4`;
    await exec(cmdstring2);
  } else {
    const cmdstring1 = `ffmpeg -i ${ToPath}/1.mp4 -vf fade=in:0:20 ${ToPath}/2.mp4`;
    await exec(cmdstring1);
    const cmdstring2 = `ffmpeg -i ${ToPath}/2.mp4 -vf fade=out:130:20 ${ToPath}/3.mp4`;
    await exec(cmdstring2);
  }

  const cmdstring3 = `ffmpeg -i ${ToPath}/3.mp4 -vcodec copy -acodec copy -vbsf h264_mp4toannexb ${TsDirPath}/${Roomid}.ts`;
  await exec(cmdstring3);
  tspath = `${tspath}${TsDirPath}/${Roomid}.ts|`;
  HasTsNum += 1;
  if (HasTsNum === HasDownLoadNum) {
    await concatTS(SolutionId, SolutionDirPath, HasTsNum * 6 + 3);
  }
}

// 更多效果
async function MoreMagic(FilePath, SolutionImageDirPath) {
  if (translation) {
    await magicktranslation(FilePath, SolutionImageDirPath, CurrentImageSizeW, CurrentImageSizeh);// eslint-disable-line
    translation = false;
    near = true;
    far = false;
  } else if (near) {
    await magickdrawnear(FilePath, SolutionImageDirPath, CurrentImageSizeW, CurrentImageSizeh); // eslint-disable-line
    translation = false;
    near = false;
    far = true;
  } else if (far) {
    await magickdrawfar(FilePath, SolutionImageDirPath, CurrentImageSizeW, CurrentImageSizeh); // eslint-disable-line
    translation = true;
    near = false;
    far = false;
  }
}

// 获取图片尺寸大小
async function getimagesize(FilePath, SolutionImageDirPath, SolutionVideoMp4DirPath, TsDirPath, Mp3DirPath, Roomid, SolutionId, SolutionDirPath) { // eslint-disable-line
  const cmdstring = `magick identify -format "%wx%h" ${FilePath}`;
  await exec(cmdstring);
  await MoreMagic(FilePath, SolutionImageDirPath);
  await megreImage(SolutionImageDirPath, SolutionVideoMp4DirPath, TsDirPath, Mp3DirPath, Roomid, SolutionId, SolutionDirPath);  // eslint-disable-line
}

// 开始处理任务
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
    log.info(`${SolutionId}${FilePath}图片下载完成`);
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
  }).on('error', () => {
    complete();
  });
}

// 创建文件夹目录
function CreateSolutiondir(SolutionId, Room) {
  log.info(`${SolutionId}任务开始`);
  const RootPath = path.join(__dirname, 'ImageSpace');
  if (!fs.existsSync(RootPath)) {
    fs.mkdirSync(RootPath);
  }
  const SolutionDirPath = path.join(__dirname, `ImageSpace/${SolutionId}`);
  delpath = SolutionDirPath;
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
    DownLoadImage(SolutionId, SolutionRoomDirPath, Room, index, SolutionVideoTsDirPath, SolutionVideoMp3DirPath); // eslint-disable-line
  }
}

// 获取IP地址
function getIPAdress() {
  const interfaces = os.networkInterfaces();
  for (let devName in interfaces) { // eslint-disable-line
    if (interfaces.hasOwnProperty(devName)) { // eslint-disable-line
      const iface = interfaces[devName];
      for (let i = 0; i < iface.length; i += 1) {
        const alias = iface[i];
        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
          ipgetIPAdress = alias.address;
        }
      }
    }
  }
}

function Init() {
  getIPAdress();
  IsMaking = false;
  setInterval(() => {
    if (!IsMaking) {
      const prams = JSON.stringify({ ip: `${ipgetIPAdress}` });
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
      const req = http.request(options, (res) => {
        res.on('data', (data) => {
          body += data;
        }).on('end', () => {
          const obj = JSON.parse(body);
          if (obj.success) {
            if (obj.data) {
              HasDownLoadNum = 0;
              HasTsNum = 0;
              tspath = '';
              translation = true;
              near = false;
              far = false;
              IsMaking = true;
              CreateSolutiondir(obj.data.solutionId, obj.data.images);
            }
          } else {
            complete();
          }
        }).on('error', () => {
          complete();
        });
      });
      req.write(prams);
      req.end();
    }
  }, 30000);
}

Init();

module.exports = router;
