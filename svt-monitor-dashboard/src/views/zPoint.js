import React from 'react';
import RouterComponent from '@src/utils/routerComponent';
import styles from './styles.less';
import { InputNumber, message, Button, Modal, Carousel } from 'antd';
const { confirm } = Modal;
import ReactEcharts from 'echarts-for-react';
import comm from '@src/config/comm.config.js';
import moment from 'moment'
import { VtxUtil } from '@src/utils/util';
import echartsOption from '@src/components/optionEcharts';
import { hostIp } from '@src/config/comm.config.js';
let XARR = [];
let timer = null;
import { connect } from 'dva';
import { deviceLatestService, dashboardService, VoiceSound, carCamera } from '@src/services/remoteService';
import echarts from 'echarts';
import { syncEchartsZoom } from '@src/utils/echartsUtil.js';
let myEchartsDb = null;
let myEchartsDensity = null;
let totalArr = [];
let dbMaxDiffInfo = {
    diff: 0, // 最大差值
    freq: '', // 对应频率
    index: -1, // 对应X轴索引
    maxValue: 0, // 该频率下最大值
    minValue: 0 // 该频率下最小值
};
@connect(({ boardM }) => ({ boardM }))
class XJXC extends RouterComponent {
    constructor(props) {
        super(props);
        this.namespace = 'xjxc';
        this.state = {
        }
        this.handleResize = this.handleResize.bind(this);
    }

    componentWillUnmount() {
        if (timer) {
            clearInterval(timer)
        }
        if (myEchartsDb) {
            myEchartsDb.dispose();
            myEchartsDb = null;
        }
        if (myEchartsDensity) {
            myEchartsDensity.dispose();
            myEchartsDensity = null;
        }
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }

        window.removeEventListener('resize', this.handleResize);

        if (this.unbindEchartsSync && typeof this.unbindEchartsSync === 'function') {
            this.unbindEchartsSync();
        }
    }
    componentDidMount() {
        this.getData();
        //  this.getTop20();
        // timer=setInterval(()=>{
        //     this.getData();
        //     //  this.getTop20();
        // },60*1000)
        window.addEventListener('resize', this.handleResize);
    }

    handleResize = () => {
        // 使用防抖避免频繁触发
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }

        this.resizeTimer = setTimeout(() => {
            // 重新调整图表大小
            if (myEchartsDb && typeof myEchartsDb.resize === 'function') {
                myEchartsDb.resize();
            }
            if (myEchartsDensity && typeof myEchartsDensity.resize === 'function') {
                myEchartsDensity.resize();
            }
        }, 300); // 300ms防抖
    }

    calcDbMaxDiff = () => {
        const diffInfo = {
            diff: 0,
            freq: '',
            index: -1,
            maxValue: 0,
            minValue: 0
        };
        if (!totalArr.length || !XARR.length) return diffInfo;

        for (let xIndex = 0; xIndex < XARR.length; xIndex++) {
            const currentFreq = XARR[xIndex];
            const dbValues = [];
            for (let groupIndex = 0; groupIndex < totalArr.length; groupIndex++) {
                const dbValue = totalArr[groupIndex].dbArr[xIndex];
                if (dbValue != null && !isNaN(Number(dbValue))) {
                    dbValues.push(Number(dbValue));
                }
            }

            if (dbValues.length < 2) continue;

            const currentMax = Math.max(...dbValues);
            const currentMin = Math.min(...dbValues);
            const currentDiff = currentMax - currentMin;

            if (currentDiff > diffInfo.diff) {
                diffInfo.diff = currentDiff;
                diffInfo.freq = currentFreq;
                diffInfo.index = xIndex;
                diffInfo.maxValue = currentMax;
                diffInfo.minValue = currentMin;
            }
        }

        return diffInfo;
    }

    updateDbEchartsTooltip = (option) => {
        option.tooltip = {
            ...option.tooltip,
            hideDelay: 10000,
            formatter: (params) => {
                if (!params || !params.length) return '';

                const xIndex = params[0].dataIndex;
                const currentFreq = XARR[xIndex] || '未知频率';

                const dbValues = [];
                for (let groupIndex = 0; groupIndex < totalArr.length; groupIndex++) {
                    const dbValue = totalArr[groupIndex].dbArr[xIndex];
                    if (dbValue != null && !isNaN(Number(dbValue))) {
                        dbValues.push(Number(dbValue));
                    }
                }

                let currentDiffStr = '当前差值：无有效数据';
                let currentMax = null;
                if (dbValues.length >= 2) {
                    currentMax = Math.max(...dbValues);
                    const currentMin = Math.min(...dbValues);
                    const currentDiff = currentMax - currentMin;
                    currentDiffStr = `当前差值：${currentDiff.toFixed(4)}<br/>最大值：${currentMax.toFixed(4)}<br/>最小值：${currentMin.toFixed(4)}`;
                }

                let tooltipContent = '';
                tooltipContent += currentDiffStr;
                tooltipContent += `<br/><hr style="border: none; border-top: 1px solid #ccc; margin: 6px 0;"/>`;
                tooltipContent += `${currentFreq}Hz<br/>`;
                params.forEach((item) => {
                    const colorCircle = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:4px;"></span>`;
                    const isMaxValue = currentMax !== null && Math.abs(Number(item.data) - currentMax) < 0.0001;
                    if (isMaxValue) {
                        tooltipContent += `${colorCircle}<span style="color: #ff6a6aff; font-size: 16px; font-weight: 500;">${item.seriesName}：${item.data || '无数据'}</span><br/>`;
                    } else {
                        tooltipContent += `${colorCircle}${item.seriesName}：${item.data || '无数据'}<br/>`;
                    }
                });

                return tooltipContent;
            }
        };
        return option;
    }

    getData = () => {
        totalArr = [];
        const { info } = this.props;
        let ret = info.list;
        XARR = [];
        for (let i = 0; i < ret.length; i++) {
            let dbArr = [];
            let densityArr = [];
            let xArr = [];
            XARR = [];
            for (let j = 0; j < ret[i].avgFrequencyDtoList.length; j++) {
                let temp = ret[i].avgFrequencyDtoList[j];
                dbArr.push(temp.db ? temp.db.toFixed(4) : undefined);
                densityArr.push(temp.density.toFixed(4));
                xArr.push(Math.sqrt(Number(temp.freq1) * Number(temp.freq2)).toFixed(4));
                XARR.push(Math.sqrt(Number(temp.freq1) * Number(temp.freq2)).toFixed(4));
            }
            totalArr[i] = {
                ...ret[i],
                dbArr,
                densityArr,
                xArr,
                time: moment(ret[i].time).format('YYYY-MM-DD HH:mm:ss')
            }
        }
        this.dealEcharts();
    }

    dealEcharts = () => {
        // 处理图表数据
        let that = this;
        let finallydbArr = [];
        let finallydensityArr = [];

        const generateTimeGradientColors = (totalCount) => {
            const colors = [];
            const count = Math.max(totalCount, 1);
            const step = count > 1 ? 255 / (count - 1) : 0;

            for (let i = 0; i < count; i++) {
                const r = 255;
                const g = Math.floor(i * step);
                const b = 0;

                colors.push(`rgb(${r}, ${g}, ${b})`);
            }
            return colors;
        };

        const sortedTotalArr = [...totalArr].sort((a, b) => {
            return new Date(b.time) - new Date(a.time);
        });

        const timeGradientColors = generateTimeGradientColors(sortedTotalArr.length);

        for (let j = 0; j < totalArr.length; j++) {
            const currentColor = timeGradientColors[j];

            finallydbArr.push({
                name: totalArr[j].time,
                type: "line",
                data: totalArr[j].dbArr,
                itemStyle: {
                    color: currentColor
                },
                lineStyle: {
                    color: currentColor,
                }
            })
            finallydensityArr.push({
                name: totalArr[j].time,
                type: "line",
                data: totalArr[j].densityArr,
                itemStyle: {
                    color: currentColor
                },
                lineStyle: {
                    color: currentColor,
                }
            })
        }

        dbMaxDiffInfo = this.calcDbMaxDiff();

        if (that.echartsBoxDb) {
            if (myEchartsDb == null) {
                myEchartsDb = echarts.init(that.echartsBoxDb);
            }
            if (myEchartsDb) {
                let optionDb = JSON.parse(JSON.stringify(echartsOption.optionDb));
                optionDb.xAxis[0].data = XARR || [];
                optionDb.series = finallydbArr || [];

                optionDb.series[0].markPoint = {
                    enabled: true,
                    symbol: 'pin',
                    symbolSize: 15,
                    z: 10,
                    label: {
                        show: true,
                        formatter: `${dbMaxDiffInfo.freq}Hz最大差值\n${dbMaxDiffInfo.diff.toFixed(4)}`,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 'bold',
                        position: 'top'
                    },
                    itemStyle: {
                        color: '#f56954',
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    data: [
                        (dbMaxDiffInfo.index !== -1) ? {
                            name: `@${dbMaxDiffInfo.freq}Hz`,
                            xAxis: dbMaxDiffInfo.index,
                            yAxis: dbMaxDiffInfo.maxValue,
                            value: dbMaxDiffInfo.diff.toFixed(4)
                        } : null
                    ].filter(Boolean)
                };
                optionDb = this.updateDbEchartsTooltip(optionDb);

                myEchartsDb.setOption(optionDb);
                myEchartsDb.on('finished', () => {
                    myEchartsDb.resize();
                });
            }
        }

        if (that.echartsBoxDensity) {
            if (myEchartsDensity == null) {
                myEchartsDensity = echarts.init(that.echartsBoxDensity);
            }
            if (myEchartsDensity) {
                let optionDensity = JSON.parse(JSON.stringify(echartsOption.optionDensity));
                optionDensity.xAxis[0].data = XARR || [];
                optionDensity.series = finallydensityArr || [];
                myEchartsDensity.setOption(optionDensity);
                myEchartsDensity.on('finished', () => {
                    myEchartsDensity.resize();
                });
            }
        }

        this.unbindEchartsSync = syncEchartsZoom(myEchartsDb, myEchartsDensity);
    }

    render() {
        let that = this;
        const { name, deviceId, act, deviceName, info } = this.props;
        const { } = this.state;
        return (
            <div className={styles.container}>
                <div className={styles.title}>{info.pointName}</div>
                <div className={styles.listFlex}>
                    <div><span className={styles.blue}>偏差值：</span>{info.value.toFixed(4)}</div>
                </div>

                <div className={styles.soundEcharts}>
                    <div ref={
                        (c) => {
                            this.echartsBoxDb = c
                        }
                    }
                        style={
                            {
                                width: '100%',
                                height: '300px',
                            }
                        }
                    />
                    <div ref={
                        (c) => {
                            this.echartsBoxDensity = c
                        }
                    }
                        style={
                            {
                                width: '100%',
                                height: '300px',
                            }
                        }
                    />
                </div>



                <div className={styles.voiceWrapper}>
                    {
                        (this.props.info.list || []).map((item, index) => {
                            return (
                                item.filePath ? <div key={index} className={styles.listFlex}>
                                    <p>{moment(item.time).format('YYYY-MM-DD HH:mm:ss')}</p>                     <audio src={`http://${hostIp}:36052/jiepai/hardware/device/type/das/soundDetector/findWavByFile?filePath=` + item.filePath} ref={(audio) => { this.audioValue = audio; }} controls></audio>
                                </div> : ''

                            )
                        })
                    }
                </div>

            </div>
        )
    }
}

export default XJXC;
