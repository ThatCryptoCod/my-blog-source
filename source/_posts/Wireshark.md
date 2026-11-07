---
title: Wireshark应用实践：QQ流量分析与明文传输探讨
date: 2026-10-25 12:00:00
tags:
  - 网络抓包
  - Wireshark
  - 网络安全
---

## 一、 实验目的
1. 掌握 Wireshark 的基础抓包操作、显示过滤器使用（筛选 IP、协议等）。
2. 学会使用追踪 TCP 流、十六进制搜索等功能分析应用层数据。
3. 分析 QQ 客户端的通信协议（TCP/UDP）及数据加密状态。

## 二、 实验环境
* **操作系统**：Windows
* **抓包工具**：Wireshark
* **网络环境**：PC 端与手机端连接同一局域网 Wi-Fi
* **目标应用**：PC 端 QQ / 手机端 QQ

## 三、 实验过程与分析

### 任务一：QQ 通信协议分析（UDP or TCP？）
在捕获的 QQ 流量中，我观察到了大量的 UDP 和 TCP 数据包。

* **UDP 特征**：如截图所示，抓到了基于 IPv6 的 **DNS 查询响应包**。源端口为 53，目的端口为随机高端口。通过解析十六进制数据区，可以清晰看到明文的域名 `ve-mdt.qq.com`。这说明 QQ 在启动或发送消息前，会通过 UDP 协议向 DNS 服务器请求腾讯服务器的 IP 地址。

![0defbd8acd5c3f54410efd20b2d13fb9](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/0defbd8acd5c3f54410efd20b2d13fb9.jpg)

* **TCP 特征**：在后续的数据传输中，抓到了大量目的端口为 **443** 的 TCP 数据包。数据包列表显示了 `Seq`、`Ack` 以及 `[TCP segment of a reassembled PDU]` 等提示，说明 QQ 的实质业务数据（如消息、文件）主要依赖 TCP 协议进行稳定传输。

![abb31cdacebae67def56f9ee08a62640](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/abb31cdacebae67def56f9ee08a62640.jpg)

**结论**：QQ 的通信**既有 UDP 也有 TCP**。UDP 多用于 DNS 域名解析；TCP 则承载了核心的数据传输。

### 任务二：通信数据状态分析（加密 or 明文？）
QQ 的通信内容在应用层是**高度加密**的。

如抓包截图所示，在目的端口为 443 的 TCP 流量中，协议被识别为 `TLSv1.3`。查看数据包的十六进制数据区（Packet Bytes），全是随机的十六进制值，右侧 ASCII 码区域显示为不可读的乱码。这证明 QQ 使用了强加密机制（TLS/SSL），防止流量被中间人窃听。

![57a17bf6613bc8934d23467581f7f85c](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/57a17bf6613bc8934d23467581f7f85c.png)

### 任务三：尝试恢复明文传输的文件
本实验要求尝试恢复可能为明文传输的文件（利用文件头特征码，如 JPG 的 `FF D8 FF`）。

1. **特征码搜索失败**：使用 `Ctrl + F` 调出搜索框，选择“分组字节流”和“十六进制值”，搜索 `ff d8 ff`。Wireshark 提示“**无分组包含这些字节流**”。结合前一步分析，这是因为 QQ 传输图片和文件时全部走了加密通道，原始的文件头特征码已经被彻底打乱加密了。

2. **排查系统干扰流量**：在尝试使用“导出 HTTP 对象”时，发现列表中全是 `msftconnecttest.com` 发送的 22 字节的 `text/plain` 文件。这是 Windows 系统自带的网络连通性探测请求，并非 QQ 的真实业务流量。

## 四、 实验总结
通过本次实验，我掌握了 Wireshark 的基本抓包和过滤技巧。同时发现，现代版本的 QQ 已经全面启用了 TLS 加密通信，无论是文字还是文件传输都受到了保护，导致我们在网络层无法直接搜索到明文文件特征，这极大地保障了用户的隐私安全。