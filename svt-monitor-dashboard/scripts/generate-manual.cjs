// 使用 docx 库生成《云音声脑声振温在线监测平台 使用说明书》Word 文档
// 运行命令（在 svt-monitor-dashboard 目录下）：
//   npm run generate:manual

// 注意：本脚本为 Node.js CommonJS 写法（.cjs），与 package.json 中 type: "module" 共存

const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  AlignmentType,
  PageOrientation
} = require('docx');

function createHeading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { after: 200 }
  });
}

function createParagraph(text) {
  return new Paragraph({
    children: [new TextRun({ text })],
    spacing: { after: 120 }
  });
}

function createBoldParagraph(label, content) {
  return new Paragraph({
    children: [
      new TextRun({ text: label, bold: true }),
      new TextRun({ text: content ?? '' })
    ],
    spacing: { after: 120 }
  });
}

async function main() {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
            size: {
              orientation: PageOrientation.PORTRAIT
            }
          }
        },
        children: [
          // 封面
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 4000, after: 400 },
            children: [
              new TextRun({
                text: '云音声脑声振温在线监测平台',
                bold: true,
                size: 56
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 2000 },
            children: [
              new TextRun({
                text: '使用说明书',
                bold: true,
                size: 48
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '浙江云音声脑科技有限公司',
                size: 28
              })
            ]
          }),
          new Paragraph({}), // 空行分隔

          // 版权声明
          createHeading('版权声明', HeadingLevel.HEADING_1),
          createParagraph(
            '本软件使用手册的知识产权及相关所有权利，均归属于浙江云音声脑科技有限公司。未经本公司书面明确授权，任何单位或个人不得以任何形式（包括但不限于复制、修改、发行、出租、信息网络传播等）使用本手册的全部或部分内容。'
          ),
          createParagraph(
            '本软件使用手册仅供用户学习和参考之用，严禁用于商业目的。使用手册中的内容只能在遵守适用法律法规的前提下合理使用。否则，本公司将依据《中华人民共和国著作权法》及相关法律追究经济赔偿和其他侵权法律责任。'
          ),
          createParagraph(
            '本软件使用手册的内容可能随时更新和修改，浙江云音声脑科技有限公司保留对其进行变更的权利。浙江云音声脑科技有限公司对使用手册的准确性、完整性或实用性不作任何明示或暗示的保证，用户应自行承担使用手册所产生的风险。'
          ),
          createParagraph(
            '本软件使用手册严格遵守中国法律法规，不得输出任何政治相关内容和在中国境内敏感的内容，一切后果由使用者自行承担。如有任何问题，请联系浙江云音声脑科技有限公司进行处理。使用本软件使用手册即表示您已知悉并同意以上声明。'
          ),

          // 第1章
          createHeading('第1章 手册简介', HeadingLevel.HEADING_1),
          createHeading('1.1 目的', HeadingLevel.HEADING_2),
          createParagraph(
            '本手册用于指导用户正确使用“云音声脑声振温在线监测平台”，帮助运维及管理人员快速理解平台结构，熟练掌握主要操作流程，提升设备管理与运维效率。'
          ),
          createParagraph(
            '通过阅读本手册，用户可以掌握如何登录系统、浏览首页监测大屏、查看设备详情、使用振动点位和声音点位监测页面等功能，实现对设备状态的实时监控与预警。'
          ),
          createHeading('1.2 使用范围', HeadingLevel.HEADING_2),
          createParagraph(
            '本手册适用于已获得云音声脑声振温在线监测平台访问权限的用户，包括设备运维人员、生产线管理人员、设备管理与信息化人员等。'
          ),

          // 第2章 平台整体功能（摘要版）
          createHeading('第2章 平台整体功能', HeadingLevel.HEADING_1),
          createHeading('2.1 用户登录页面', HeadingLevel.HEADING_2),
          createParagraph(
            '用户通过浏览器访问平台地址，在登录页面输入用户名和密码并点击“登录”按钮即可进入系统。账号密码错误时，系统会给出提示，请确认后重新输入或联系管理员处理。'
          ),
          createHeading('2.2 首页监测大屏（Dashboard）', HeadingLevel.HEADING_2),
          createParagraph(
            '首页监测大屏是平台的总览看板，主要由数据统计区、预警总览区和 TOP3 指标排名区构成，并提供预警设备详情弹窗入口，帮助用户从全局视角把握设备运行与预警情况。'
          ),
          createHeading('2.2.1 数据统计区', HeadingLevel.HEADING_3),
          createParagraph(
            '数据统计区以卡片形式展示“健康设备数”“故障报警设备”“监控总设备数”“趋势预警设备”等关键统计指标。点击“故障报警设备”或“趋势预警设备”卡片，可打开预警设备详情弹窗。'
          ),
          createHeading('2.2.2 预警总览区', HeadingLevel.HEADING_3),
          createParagraph(
            '预警总览区以卡片网格展示典型设备的预警情况，包括设备名称、状态指示点以及各监测点位的健康/预警分布。用户可通过时间过滤与排序功能，快速筛选目标时间段内的预警设备并点击卡片跳转到设备详情页面。'
          ),
          createHeading('2.2.3 TOP3 指标排名区', HeadingLevel.HEADING_3),
          createParagraph(
            '该区域展示振动烈度 Top3、声音响度 Top3、温度 Top3 等关键指标的排名，用户可以点击具体行跳转到对应设备详情，或点击“更多”查看完整排名列表。'
          ),
          createHeading('2.2.4 预警设备详情弹窗', HeadingLevel.HEADING_3),
          createParagraph(
            '预警设备详情弹窗以表格形式列出具有代表性的预警设备及其点位，支持点击设备名称跳转到设备详情页面，点击点位名称跳转到声音点位监测页面。'
          ),

          createHeading('2.3 设备详情页面', HeadingLevel.HEADING_2),
          createParagraph(
            '设备详情页面主要由设备信息模块、点位列表模块以及多指标数据分析模块组成，用于对单台设备进行深入的状态与趋势分析。'
          ),
          createHeading('2.3.1 设备信息模块', HeadingLevel.HEADING_3),
          createParagraph(
            '设备信息模块展示设备名称、型号、生产厂家、安装位置、工作转速、设计流量、压力等基础信息，并提供编辑/保存与收起/展开操作。模块中还包含声音/振动健康度仪表盘，可切换查看不同维度的健康度指标。'
          ),
          createHeading('2.3.2 点位列表模块', HeadingLevel.HEADING_3),
          createParagraph(
            '点位列表模块展示当前设备下所有监测点位的编号、名称、预警时间、预警类型、预警值及处理状态。点击行可选中点位，右下方分析图表会随之更新。对于声音或振动预警点位，可通过“未处理”按钮快速跳转到对应的声音点位或振动点位监测页面。'
          ),
          createHeading('2.3.3 多指标数据分析模块', HeadingLevel.HEADING_3),
          createParagraph(
            '多指标数据分析模块通过多张图表与配置表单，对当前选中点位的温度、声音、振动等指标进行趋势和偏差分析。用户可以设置时间范围与分析间隔，并在图表或弹窗中查看详细的趋势变化。'
          ),

          createHeading('2.4 振动点位监测页面', HeadingLevel.HEADING_2),
          createParagraph(
            '振动点位监测页面针对单个振动监测点位，集中展示其基本振动指标、频域瀑布图、振动频域图与振动时域图，帮助用户识别振动能量变化和频谱特征。'
          ),
          createHeading('2.4.1 基本振动指标模块', HeadingLevel.HEADING_3),
          createParagraph(
            '基本指标模块以卡片形式展示速度有效值、速度最大值、加速度有效值、加速度最大值四项数据，用于快速评估当前点位的振动水平。'
          ),
          createHeading('2.4.2 频域瀑布图模块', HeadingLevel.HEADING_3),
          createParagraph(
            '频域瀑布图模块以 3D 方式展示在一定时间范围和时间间隔下频率-时间-速度有效值的变化情况，支持调整时间范围和间隔，并通过悬停提示查看具体频率与速度值。'
          ),
          createHeading('2.4.3 振动频域图与时域图模块', HeadingLevel.HEADING_3),
          createParagraph(
            '振动频域图用于查看当前采样的频谱特征，支持倍频提示；振动时域图用于查看时域波形，二者结合可以更好地判断设备的振动状态与潜在故障特征。'
          ),

          createHeading('2.5 声音点位监测页面', HeadingLevel.HEADING_2),
          createParagraph(
            '声音点位监测页面针对单个声音采集点位，展示声音能量与密度曲线、声音数据分析表格以及详细信息与音频播放模块，便于对声音特征进行直观分析与复现。'
          ),
          createHeading('2.5.1 能量/密度曲线模块', HeadingLevel.HEADING_3),
          createParagraph(
            '能量/密度曲线模块分别以折线图展示多条采样记录在频率维度上的能量与密度分布，用户可通过表格勾选控制曲线是否显示，并使用缩放与拖动功能聚焦某一频段。'
          ),
          createHeading('2.5.2 声音数据分析表格模块', HeadingLevel.HEADING_3),
          createParagraph(
            '声音数据分析表格列出最近多条声音偏差记录，包括上传时间、偏差值以及查看曲线、下载文件、播放等操作。用户可以通过勾选控制上方曲线显示，点击“查看曲线”打开详细频谱弹窗，点击“下载文件”获取 wav 文件，点击“播放”在右侧播放器中收听对应声音。'
          ),
          createHeading('2.5.3 声音详细信息与音频播放模块', HeadingLevel.HEADING_3),
          createParagraph(
            '详细信息模块展示聚类名称、生产设备、子部件、检测设备、听筒、点位名称、偏差值等字段，并提供统一音频播放器播放当前记录的声音，便于结合图表进行综合判断。'
          ),

          // 第3章 其他问题
          createHeading('第3章 其他问题', HeadingLevel.HEADING_1),
          createParagraph(
            '由于设备类型、安装环境与工况条件存在差异，具体的故障诊断与处理方案需结合实际情况综合研判。本平台主要用于提供多源数据的可视化与预警能力，降低人工巡检负担并提升故障发现的及时性。'
          ),
          createParagraph(
            '在使用过程中，如遇平台无法登录、数据异常、图表加载失败或本手册未覆盖的技术问题，请及时联系浙江云音声脑科技有限公司的售后服务或技术支持团队，以获得专业、及时且有针对性的支持。'
          )
        ]
      }
    ]
  });

  const outputDir = path.resolve(process.cwd(), 'docs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(outputDir, '云音声脑声振温在线监测平台-使用说明书.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);

  // 控制台提示
  // eslint-disable-next-line no-console
  console.log(`使用说明书已生成：${filePath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('生成使用说明书失败：', err);
  process.exit(1);
});

