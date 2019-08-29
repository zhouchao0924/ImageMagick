/* eslint-disable no-await-in-loop1 */
const express = require('express');

const router = express.Router();

const shell = require('shelljs');

const fs = require('fs');

const path = require('path');

const request = require('request');

const agileLog = require('agile-log');

const os = require('os');

const log = agileLog.getLogger('app');

const ffmpeg = 'ffmpeg';

const magick = 'sudo convert';

const concat = require('ffmpeg-concat');

const exectime = require('child_process').exec;

let CurrentImageSizeW;
let CurrentImageSizeh;
let HasDownLoadNum;
let HasTsNum;
let IsMaking;
let delpath;
let ipgetIPAdress;
let CurrentjobId;
let StyleId;
let mp4pathlist;
let totaltime;
let CurrentvideoSizeW;// eslint-disable-line
let CurrentvideoSizeh;

const alltransitions = [
  {
    name: 'swap',
    duration: 500
  },
  {
    name: 'cube',
    duration: 500
  },
  {
    name: 'circleopen',
    duration: 500
  },
  {
    name: 'directionalwarp',
    duration: 500
  }, {
    name: 'directionalwipe',
    duration: 500
  },
  {
    name: 'crossWarp',
    duration: 500
  },
  {
    name: 'crosszoom',
    duration: 500
  },
  {
    name: 'dreamy',
    duration: 500
  }, {
    name: 'squareswire',
    duration: 500
  },
  {
    name: 'angular',
    duration: 500
  },
  {
    name: 'radial',
    duration: 500
  },
  {
    name: 'fade',
    duration: 500
  },
  {
    name: 'fadegrayscale',
    duration: 500
  }
];

function getRandomArrayElements(arr, count) {
  const shuffled = arr.slice(0);
  const i = arr.length;
  const min = i - count;
  let tempa;
  let index;
  for (let i = 0; min < i; i--) {
    index = Math.floor((i + 1) * Math.random());
    tempa = shuffled[index];
    shuffled[index] = shuffled[i];
    shuffled[i] = tempa;
  }
  return shuffled.slice(min);
}

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
function complete(logs) {
  log.info(logs);
  deleteFolder(delpath);
  setTimeout(() => {
    IsMaking = false;
  }, 10000);
}

// 上传完成后，给后台的回执
function callback(SolutionId, url) {
  const requestData = {
    message: '视频制作完成',
    solutionId: SolutionId,
    jobId: CurrentjobId,
    success: true,
    videoUrl: url
  };
  const options = {
    url: 'http://irayproxy.sit.ihomefnt.org/collectVideoResult',
    method: 'POST',
    json: true,
    headers: {
      'Content-Type': 'application/json'
    },
    body: requestData
  };
  request(options, (err, res, body) => {
    if (!err && res.statusCode === 200) {
      if (body.success) {
        complete(`${SolutionId}任务结束,上传回执完成`);
      } else {
        complete('回执上传失败');
      }
    } else {
      complete('回执接口调动失败');
    }
  });
}

// 上传视频
function UploadMP4(FilePath, SolutionId) {
  let sbody = '';
  const upload = request.post('http://192.168.1.33:11133/unifyfile/file/drGeneralUpload');
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
      complete('上传失败');
    }
  }).on('error', () => {
    complete('上传视频接口调用失败');
  });
}

// 根据获取的参数循环执行cmd
// 平移效果
async function magicktranslation(FilePath, ToPath, w, h, SolutionVideoMp4DirPath) {
  if (CurrentImageSizeW === 2560 && CurrentImageSizeh === 1440) {
    for (let index = 0; index < 400; index += 1) {
      const Name = intToString(index, 3);
      const cw = h / 2;
      const cmdstring = `${magick} ${FilePath} -crop ${cw}x${h}+${w / 2 - 1160 + index * 4}+0 ${ToPath}/${Name}.jpg`;
      await exec(cmdstring);
    }
    const cmdstring2 = `${ffmpeg} -i ${ToPath}/%3d.jpg -s 1080x2160 -filter:v "setpts=0.3*PTS" ${SolutionVideoMp4DirPath}/1.mp4`;
    await exec(cmdstring2);
  } else if (CurrentImageSizeW === 1920 && CurrentImageSizeh === 1440) {
    for (let index = 0; index < 400; index += 1) {
      const Name = intToString(index, 3);
      const cw = h / 2;
      const cmdstring = `${magick} ${FilePath} -crop ${cw}x${h}+${w / 2 - 960 + index * 3}+0 ${ToPath}/${Name}.jpg`;
      await exec(cmdstring);
    }
    const cmdstring2 = `${ffmpeg} -i ${ToPath}/%3d.jpg -s 1080x2160 -filter:v "setpts=0.3*PTS" ${SolutionVideoMp4DirPath}/1.mp4`;
    await exec(cmdstring2);
  } else if (CurrentImageSizeW === 3840 && CurrentImageSizeh === 2160) {
    for (let index = 0; index < 400; index += 1) {
      const Name = intToString(index, 3);
      const cw = h / 2;
      const cmdstring = `${magick} ${FilePath} -crop ${cw}x${h}+${w / 2 - 1740 + index * 6}+0 ${ToPath}/${Name}.jpg`;
      await exec(cmdstring);
    }
    const cmdstring2 = `${ffmpeg} -i ${ToPath}/%3d.jpg -s 1080x2160 -filter:v "setpts=0.3*PTS" ${SolutionVideoMp4DirPath}/1.mp4`;
    await exec(cmdstring2);
  } else if (CurrentImageSizeW === 2880 && CurrentImageSizeh === 2160) {
    for (let index = 0; index < 400; index += 1) {
      const Name = intToString(index, 3);
      const cw = h / 2;
      const cmdstring = `${magick} ${FilePath} -crop ${cw}x${h}+${w / 2 - 1340 + index * 4}+0 ${ToPath}/${Name}.jpg`;
      await exec(cmdstring);
    }
    const cmdstring2 = `${ffmpeg} -i ${ToPath}/%3d.jpg -s 1080x2160 -filter:v "setpts=0.3*PTS" ${SolutionVideoMp4DirPath}/1.mp4`;
    await exec(cmdstring2);
  }
}

// 拉近效果
async function magickdrawnear(FilePath, ToPath, w, h) {
  for (let index = 0; index < 100; index += 1) {
    const Name = intToString(index, 3);
    const ch = h * (1 - index * 0.004);
    const cw = ch / 2;
    const cmdstring = `${magick} ${FilePath} -gravity center -extent ${cw}x${ch} ${ToPath}/${Name}.jpg`;
    await exec(cmdstring);
  }
}

// 拉远效果
async function magickdrawfar(FilePath, ToPath, w, h) {
  for (let index = 0; index < 100; index += 1) {
    const Name = intToString(index, 3);
    const ch = h * (1 - (100 - index) * 0.004);
    const cw = ch / 2;
    const cmdstring = `${magick} ${FilePath} -gravity center -extent ${cw}x${ch} -resize ${h / 2}x${h} ${ToPath}/${Name}.jpg`;
    await exec(cmdstring);
  }
}

// 添加音乐和水印
async function AddMusic(RootPath, SolutionDirPath, SolutionId, Style) {
  const cmdstring = `ffmpeg -i ${SolutionDirPath}/${SolutionId}-ts.mp4 -vcodec copy -acodec copy -vbsf h264_mp4toannexb ${SolutionDirPath}/1.ts`;
  await exec(cmdstring);
  if (CurrentvideoSizeW === 720) {
    const cmdstring2 = `ffmpeg -i "concat:${SolutionDirPath}/1.ts|${RootPath}/720.ts" -acodec copy -vcodec copy -absf aac_adtstoasc ${SolutionDirPath}/${SolutionId}.mp4`;
    await exec(cmdstring2);
  } else {
    const cmdstring2 = `ffmpeg -i "concat:${SolutionDirPath}/1.ts|${RootPath}/1080.ts" -acodec copy -vcodec copy -absf aac_adtstoasc ${SolutionDirPath}/${SolutionId}.mp4`;
    await exec(cmdstring2);
  }
  let alltime;
  if (totaltime >= 60) {
    alltime = `00:01:${totaltime - 60}`;
  } else {
    alltime = totaltime + 2;
  }
  const myDate = new Date();
  const currentSeconds = myDate.getSeconds().toString();
  const MusicName = currentSeconds.substr(currentSeconds.length - 1, 1);
  const cmdstring3 = `${ffmpeg} -i ${RootPath}/${Style}/${MusicName}.mp3 -ss 00:00:00 -t ${alltime} -acodec copy ${SolutionDirPath}/mp3/${SolutionId}.mp3`;
  await exec(cmdstring3);
  const cmdstring4 = `${ffmpeg} -i ${SolutionDirPath}/${SolutionId}.mp4 -i ${SolutionDirPath}/mp3/${SolutionId}.mp3 -c:v copy -c:a aac -strict experimental ${SolutionDirPath}/${SolutionId}-output.mp4`;
  await exec(cmdstring4);
  const cmdstring5 = `${ffmpeg} -i ${SolutionDirPath}/${SolutionId}-output.mp4 -ignore_loop 0 -i ${RootPath}/logo.gif -filter_complex "[0:v][1:v]overlay=${CurrentvideoSizeh / 4 - 300}:${CurrentvideoSizeh - 200}:shortest=1" ${SolutionDirPath}/${SolutionId}-v.mp4`;
  await exec(cmdstring5);
  UploadMP4(`${SolutionDirPath}/${SolutionId}-v.mp4`, SolutionId);
}

// 获取视频时长和分辨率
async function getvideotimeandsize(Filepath, RootPath, SolutionDirPath, SolutionId) {
  const cmd = `ffmpeg -i ${Filepath}`;
  await exectime(cmd, (err, stdout, stderr) => {
    const outStr = stderr.toString();
    const regDurationtime = /Duration\: ([0-9\:\.]+),/;// eslint-disable-line
    const rstime = regDurationtime.exec(outStr);

    let videosize;
    const regDurationSize = /[0-9]{4}x[0-9]{4}/;
    if (regDurationSize.exec(outStr)) {
      videosize = regDurationSize.exec(outStr);
    } else {
      const reg = /[0-9]{3}x[0-9]{4}/;
      videosize = reg.exec(outStr);
    }
    if (rstime && rstime[1]) {
      const timeStr = rstime[1];
      const hour = timeStr.split(':')[0];
      const min = timeStr.split(':')[1];
      const sec = timeStr.split(':')[2].split('.')[0];
      totaltime = Number(hour * 3600) + Number(min * 60) + Number(sec);
    }
    if (videosize[0]) {
      const sizeStr = videosize[0];
      const SizeArray = sizeStr.split('x');
      CurrentvideoSizeW = Number(SizeArray[0]);
      CurrentvideoSizeh = Number(SizeArray[1]);
    }
    AddMusic(RootPath, SolutionDirPath, SolutionId, StyleId);
  });
}

// 将所有视频连接起来
async function concatmp4(SolutionId, SolutionDirPath) {
  const RootPath = path.join(__dirname, 'ImageSpace');
  // const currentlist = alltransitions.slice(0, HasTsNum - 1);
  if (HasTsNum > 1) {
    await concat({
      output: `${SolutionDirPath}/${SolutionId}-ts.mp4`,
      videos: mp4pathlist,
      transitions: getRandomArrayElements(alltransitions, HasTsNum - 1)
    });
  }
  await getvideotimeandsize(`${SolutionDirPath}/${SolutionId}-ts.mp4`, RootPath, SolutionDirPath, SolutionId);
}

// 转场效果连接各个MP4文件
async function concatTS(SolutionId, SolutionDirPath) {
  concatmp4(SolutionId, SolutionDirPath);
}

// 生成完图片后用ffmpeg生成视频
async function megreImage(SolutionId, SolutionDirPath, SolutionVideoMp4DirPath) { // eslint-disable-line
  HasTsNum += 1;
  mp4pathlist.push(`${SolutionVideoMp4DirPath}/1.mp4`);
  if (HasTsNum === HasDownLoadNum) {
    await concatTS(SolutionId, SolutionDirPath);
  }
}

// 更多效果
async function MoreMagic(FilePath, SolutionImageDirPath, roomName, SolutionVideoMp4DirPath) {
  if (roomName.includes('客厅') || roomName.includes('卧')) {
    if (CurrentImageSizeW === 1080 && CurrentImageSizeh === 1440) {
      await magickdrawnear(FilePath, SolutionImageDirPath, CurrentImageSizeW, CurrentImageSizeh); // eslint-disable-line
      const cmdstring = `${ffmpeg} -i ${SolutionImageDirPath}/%3d.jpg -s 1080x2160 -filter:v "setpts=0.8*PTS" ${SolutionVideoMp4DirPath}/1.mp4`;
      await exec(cmdstring);
    } else if (CurrentImageSizeW === 1620 && CurrentImageSizeh === 2160) {
      await magickdrawnear(FilePath, SolutionImageDirPath, CurrentImageSizeW, CurrentImageSizeh); // eslint-disable-line
      const cmdstring = `${ffmpeg} -i ${SolutionImageDirPath}/%3d.jpg -s 1080x2160 -filter:v "setpts=0.8*PTS" ${SolutionVideoMp4DirPath}/1.mp4`;
      await exec(cmdstring);
    } else {
      await magicktranslation(FilePath, SolutionImageDirPath, CurrentImageSizeW, CurrentImageSizeh, SolutionVideoMp4DirPath); // eslint-disable-line
    }
  } else if (roomName.includes('餐') || roomName.includes('厨')) {
    await magickdrawnear(FilePath, SolutionImageDirPath, CurrentImageSizeW, CurrentImageSizeh); // eslint-disable-line
    const cmdstring = `${ffmpeg} -i ${SolutionImageDirPath}/%3d.jpg -s 1080x2160 -filter:v "setpts=0.8*PTS" ${SolutionVideoMp4DirPath}/1.mp4`;
    await exec(cmdstring);
  } else if (roomName.includes('卫')) {
    await magickdrawfar(FilePath, SolutionImageDirPath, CurrentImageSizeW, CurrentImageSizeh); // eslint-disable-line
    const cmdstring = `${ffmpeg} -i ${SolutionImageDirPath}/%3d.jpg -s 1080x2160 -filter:v "setpts=0.8*PTS" ${SolutionVideoMp4DirPath}/1.mp4`;
    await exec(cmdstring);
  } else if (CurrentImageSizeW === 1080 && CurrentImageSizeh === 1440) {
    await magickdrawfar(FilePath, SolutionImageDirPath, CurrentImageSizeW, CurrentImageSizeh); // eslint-disable-line
    const cmdstring = `${ffmpeg} -i ${SolutionImageDirPath}/%3d.jpg -s 1080x2160 -filter:v "setpts=0.8*PTS" ${SolutionVideoMp4DirPath}/1.mp4`;
    await exec(cmdstring);
  } else if (CurrentImageSizeW === 1620 && CurrentImageSizeh === 2160) {
    await magickdrawfar(FilePath, SolutionImageDirPath, CurrentImageSizeW, CurrentImageSizeh); // eslint-disable-line
    const cmdstring = `${ffmpeg} -i ${SolutionImageDirPath}/%3d.jpg -s 1080x2160 -filter:v "setpts=0.8*PTS" ${SolutionVideoMp4DirPath}/1.mp4`;
    await exec(cmdstring);
  } else {
    await magicktranslation(FilePath, SolutionImageDirPath, CurrentImageSizeW, CurrentImageSizeh, SolutionVideoMp4DirPath); // eslint-disable-line
  }
}

// 获取图片尺寸大小
async function getimagesize(FilePath, SolutionImageDirPath, SolutionVideoMp4DirPath, SolutionId, SolutionDirPath, roomName) { // eslint-disable-line
  const cmdstring = `${magick} identify -format "%wx%h" ${FilePath}`;
  await exec(cmdstring);
  await MoreMagic(FilePath, SolutionImageDirPath, roomName, SolutionVideoMp4DirPath);
  await megreImage(SolutionId, SolutionDirPath, SolutionVideoMp4DirPath); // eslint-disable-line
}

// 开始处理任务
async function ImagemagickInit(SolutionId, Room) {
  const SolutionDirPath = path.join(__dirname, `ImageSpace/${SolutionId}`);
  // 按空间文件夹处理图片
  for (let index = 0; index < Room.length; index += 1) {
    const SolutionRoomDirPath = path.join(SolutionDirPath, `${Room[index].roomId}`);
    const SolutionImageDirPath = path.join(SolutionRoomDirPath, 'image');
    const SolutionVideoMp4DirPath = path.join(SolutionRoomDirPath, 'video');
    await getimagesize(`${SolutionRoomDirPath}/image.jpg`, SolutionImageDirPath, SolutionVideoMp4DirPath, SolutionId, SolutionDirPath, `${Room[index].roomName}`);
  }
}

// 循环多线程下载
function DownLoadImage(SolutionId, FilePath, Room, index) {
  const stream = fs.createWriteStream(path.join(FilePath, 'image.jpg'), { autoClose: true });
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
      ImagemagickInit(SolutionId, Room); // 图片下载完成，开始处理图片
    }
  }).on('error', () => {
    complete('图片下载失败');
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
    const SolutionVideoMp3DirPath = path.join(SolutionDirPath, 'mp3');
    if (!fs.existsSync(SolutionDirPath)) {
      fs.mkdirSync(SolutionDirPath);
    }
    if (!fs.existsSync(SolutionRoomDirPath)) {
      fs.mkdirSync(SolutionRoomDirPath);
    }
    if (!fs.existsSync(SolutionVideoMp3DirPath)) {
      fs.mkdirSync(SolutionVideoMp3DirPath);
    }
    DownLoadImage(SolutionId, SolutionRoomDirPath, Room, index); // eslint-disable-line
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

// 空间重新排序
function orderRoom(solutionId, Room) {
  const newRoomArray = [];
  for (let index = 0; index < Room.length; index += 1) {
    if (Room[index].roomName === '客厅') {
      newRoomArray.push(Room[index]);
      Room.splice(index, 1);
      for (let i = 0; i < Room.length; i += 1) {
        if (Room[i].roomName === '餐厅') {
          newRoomArray.push(Room[i]);
          Room.splice(i, 1);
          for (let n = 0; n < Room.length; n += 1) {
            if (Room[n].roomName === '主卧') {
              newRoomArray.push(Room[n]);
              Room.splice(n, 1);
              for (let m = 0; m < Room.length; m += 1) {
                if (Room[m].roomName === '次卧') {
                  newRoomArray.push(Room[m]);
                  Room.splice(m, 1);
                }
              }
            }
          }
        }
      }
    }
  }
  const lastroomlist = [];
  const newroomlist = newRoomArray.concat(Room);
  for (let index = 0; index < newroomlist.length; index += 1) {
    if (!newroomlist[index].roomName.includes('阳台') && !newroomlist[index].roomName.includes('房') && !newroomlist[index].roomName.includes('卫') && !newroomlist[index].roomName.includes('间') && !newroomlist[index].roomName.includes('室')) {
      lastroomlist.push(newroomlist[index]);
    }
  }
  CreateSolutiondir(solutionId, lastroomlist);
}

function req() {
  const prams = {
    ip: `${ipgetIPAdress}`
  };
  const options = {
    url: 'http://irayproxy.sit.ihomefnt.org/popVideoJob',
    method: 'POST',
    json: true,
    headers: {
      'Content-Type': 'application/json'
    },
    body: prams
  };
  request(options, (err, res, data) => {
    if (!err && res.statusCode === 200) {
      if (data.success) {
        if (data.data) {
          HasDownLoadNum = 0;
          HasTsNum = 0;
          mp4pathlist = [];
          IsMaking = true;
          totaltime = 0;
          CurrentvideoSizeW = 0;
          CurrentvideoSizeh = 0;
          StyleId = data.data.styleId ? data.data.styleId : 4;
          CurrentjobId = data.data.jobId;
          orderRoom(data.data.solutionId, data.data.images);
        }
      } else {
        complete('未获取任务数据');
      }
    } else {
      complete('获取任务接口调用失败');
    }
  });
}

function Init() {
  getIPAdress();
  IsMaking = false;
  setInterval(() => {
    if (!IsMaking) {
      req();
    }
  }, 10000);
}

Init();

module.exports = router;
