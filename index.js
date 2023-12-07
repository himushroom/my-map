// 地图
var map = new TMap.Map("container", {
    zoom: 11,
    center: new TMap.LatLng(18.34903, 109.64683)
});
var district = new TMap.service.District({
    // 新建一个行政区划类
    polygon: 1 // 返回行政区划边界的类型
});
var polygons = new TMap.MultiPolygon({
    map: map,
    geometries: []
});

//绑定点击事件
map.on("click",function(evt){
    var lat = evt.latLng.getLat().toFixed(6);
    var lng = evt.latLng.getLng().toFixed(6);
    console.log(lat + ', ' + lng)
})
function findBorder(keyword) {
    polygons.remove(polygons.getGeometries().map((item) => item.id));
    district
        .search({ keyword })
        .then((result) => {
            // 搜索行政区划信息
            result.result.forEach((level) => {
                level.forEach((place) => {
                    var bounds = [];
                    var newGeometries = place.polygon.map((polygon, index) => {
                        bounds.push(fitBounds(polygon)); // 计算能完整呈现行政区边界的最小矩形范围
                        return {
                            id: `${place.id}_${index}`,
                            paths: polygon // 将得到的行政区划边界用多边形标注在地图上
                        };
                    });
                    bounds = bounds.reduce((a, b) => {
                        return fitBounds([
                            a.getNorthEast(),
                            a.getSouthWest(),
                            b.getNorthEast(),
                            b.getSouthWest()
                        ]);
                    }); // 若一行政区有多个多边形边界，应计算能包含所有多边形边界的范围。
                    polygons.updateGeometries(newGeometries);
                    // map.fitBounds(bounds);
                });
            });
        })
        .catch((error) => {
            console.log(`错误：${error.status}, ${error.message}`);
        });
}
function fitBounds(latLngList) {
    // 由多边形顶点坐标数组计算能完整呈现该多边形的最小矩形范围
    if (latLngList.length === 0) {
        return null;
    }
    var boundsN = latLngList[0].getLat();
    var boundsS = boundsN;
    var boundsW = latLngList[0].getLng();
    var boundsE = boundsW;
    latLngList.forEach((point) => {
        point.getLat() > boundsN && (boundsN = point.getLat());
        point.getLat() < boundsS && (boundsS = point.getLat());
        point.getLng() > boundsE && (boundsE = point.getLng());
        point.getLng() < boundsW && (boundsW = point.getLng());
    });
    return new TMap.LatLngBounds(
        new TMap.LatLng(boundsS, boundsW),
        new TMap.LatLng(boundsN, boundsE)
    );
}

const selectButton = document.getElementById("selectButton");
let flag = false;
selectButton.onclick = () => {
    if (!flag) {
        ["460203", "460204", "460202", "460205"].map((v) => {
            findBorder(v);
        });
        flag = true;
    } else {
        polygons.remove(polygons.getGeometries().map((item) => item.id));
        flag = false;
    }
};

// 文件
// var geocoder = new TMap.service.Geocoder(); // 新建一个正逆地址解析类
var markers = new TMap.MultiMarker({
    map: map,
    geometries: []
});

const dom = document.getElementById("file");

const waitTime = (time) => {
    return new Promise((r) => {
        setTimeout(() => {
            r();
        }, time);
    });
};

let ws1;
let ws2;
let ws3;
let ws4;
let sheet1;
let sheet2;
let sheet3;
let sheet4;
let marker = null;
function readExcel(e) {
    markers.setGeometries([]);
    const files = e.target.files;
    console.log(files);
    if (files.length <= 0) {
        return false;
    } else if (!/\.(xls|xlsx)$/.test(files[0].name.toLowerCase())) {
        alert("上传格式不正确，请上传xls或者xlsx格式");
        return false;
    }

    const fileReader = new FileReader();
    fileReader.onload = (ev) => {
        try {
            const data = ev.target.result;
            const workbook = XLSX.read(data, {
                type: "binary"
            });
            console.log(workbook);
            wsname1 = workbook.SheetNames[0];
            wsname2 = workbook.SheetNames[1];
            wsname3 = workbook.SheetNames[2];
            wsname4 = workbook.SheetNames[3];
            ws1 = XLSX.utils.sheet_to_json(workbook.Sheets[wsname1]);
            ws2 = XLSX.utils.sheet_to_json(workbook.Sheets[wsname2]);
            ws3 = XLSX.utils.sheet_to_json(workbook.Sheets[wsname3]);
            ws4 = XLSX.utils.sheet_to_json(workbook.Sheets[wsname4]);
            sheet1 = workbook.Sheets[wsname1];
            sheet2 = workbook.Sheets[wsname2];
            sheet3 = workbook.Sheets[wsname3];
            sheet4 = workbook.Sheets[wsname4];

            console.log(ws1);
            console.log(ws2);
            console.log(ws3);
            console.log(ws4);
            
            addAddressMarker('类型', ws3)
            initEchart()
            // transferExport(workbook, ws1, sheet1)
        } catch (e) {
            console.log(e);
        }
    };
    fileReader.readAsBinaryString(files[0]);
}

dom.addEventListener("change", (e) => {
    readExcel(e);
});

const legend = document.getElementById('legend')
const changeButton = document.getElementById("changeButton");

let isChange = false;
changeButton.onclick = () => {
    if (!ws1) return
    legend.innerHTML = ''
    console.log(isChange)
    if (!isChange) {
        isChange = true
        addAddressMarker('网点规模', ws4)
    } else {
        addAddressMarker('类型', ws3)
        isChange = false
    }
};

function addAddressMarker(keyName, ws){
    const mapData = {};
    ws1.map((v) => {
        const loc = v["经纬度"];
        if (loc && !loc.includes("-")) {
            const dot = loc.split(", ");
            const type = v[keyName];
            const color = ws.find((w) => w[keyName] === type)?.["颜色"];
            if (color) {
                if(!mapData[color]?.type){
                    mapData[color] = {}
                }
                mapData[color].type = type;
                if (mapData[color]?.loc?.length) {
                    mapData[color].loc.push(dot);
                } else {
                    mapData[color].loc = [dot];
                }
            }
        }
    });
    console.log(mapData);
    // 根据颜色生成点数据
    if (marker != null) {
        marker.setMap(null);
        marker = null;
    }

    for (const key in mapData) {
        if (Object.hasOwnProperty.call(mapData, key)) {
            const dotes = mapData[key].loc;
            const type = mapData[key].type;
            marker = new TMap.MultiMarker({
                map: map,
                styles: {
                    // 点标记样式
                    marker: new TMap.MarkerStyle({
                        width: 12, // 样式宽
                        height: 12, // 样式高
                        anchor: { x: 6, y: 6 }, // 描点位置
                        src:
                            "./icon/" + encodeURIComponent(key) + ".png"
                    })
                },
                geometries: dotes
                    .filter((v) => v[0] && v[1])
                    .map((v) => {
                        return {
                            // 标记位置(纬度，经度，高度)
                            position: new TMap.LatLng(v[0], v[1]),
                            styleId: "marker",
                        };
                    })
            });
            // style="color: ${key}"
            legend.innerHTML += `<div><img src="./icon/${encodeURIComponent(key)}.png" /><span>${type}</span></div>`
        }
    }
    marker.setMap(map);
}

// echart
function initEchart(){
    var myChart = echarts.init(document.getElementById('echartMap'));
    var uploadedDataURL = "./dist/sanya.json";
    var geoCoordMap = {};
    var customerBatteryCityData = []
    ws2.map(v => {
        geoCoordMap[v['区域']] = v['中心坐标'].split(", ")
        customerBatteryCityData.push({
            name: v['区域'],
            value: v['区域 (计数)']
        })
    })
    console.log(geoCoordMap)
    console.log(customerBatteryCityData)
    console.log($.getJSON)
    $.getJSON(uploadedDataURL, function(geoJson) {
        console.log(geoJson)
        echarts.registerMap('sanya', geoJson);
        option = {
            backgroundColor: '#fff',
            geo: [
              {
                map: 'sanya',
                aspectScale: 0.9,
                roam: false, // 是否允许缩放
                zoom: 1.2, // 默认显示级别
                layoutSize: '95%',
                layoutCenter: ['55%', '50%'],
                itemStyle: {
                  normal: {
                    areaColor: {
                      type: 'linear-gradient',
                      x: 0,
                      y: 400,
                      x2: 0,
                      y2: 0,
                      colorStops: [{
                        offset: 0,
                        color: 'rgba(37,108,190,0.3)' // 0% 处的颜色
                      }, {
                        offset: 1,
                        color: 'rgba(15,169,195,0.3)' // 50% 处的颜色
                      }],
                      global: true // 缺省为 false
                    },
                    borderColor: '#4ecee6',
                    borderWidth: 1
                  },
                  emphasis: {
                    areaColor: {
                      type: 'linear-gradient',
                      x: 0,
                      y: 300,
                      x2: 0,
                      y2: 0,
                      colorStops: [{
                        offset: 0,
                        color: 'rgba(37,108,190,1)' // 0% 处的颜色
                      }, {
                        offset: 1,
                        color: 'rgba(15,169,195,1)' // 50% 处的颜色
                      }],
                      global: true // 缺省为 false
                    }
                  }
                },
                emphasis: {
                  itemStyle: {
                    areaColor: '#0160AD'
                  },
                  label: {
                    show: 0,
                    color: '#fff'
                  }
                },
                zlevel: 3
              },
              {
                map: 'sanya',
                aspectScale: 0.9,
                roam: false, // 是否允许缩放
                zoom: 1.2, // 默认显示级别
                layoutSize: '95%',
                layoutCenter: ['55%', '50%'],
                itemStyle: {
                  normal: {
                    borderColor: 'rgba(192,245,249,.6)',
                    borderWidth: 2,
                    shadowColor: '#2C99F6',
                    shadowOffsetY: 0,
                    shadowBlur: 120,
                    areaColor: 'rgba(29,85,139,.2)'
                  }
                },
                zlevel: 2,
                silent: true
              },
              {
                map: 'sanya',
                aspectScale: 0.9,
                roam: false, // 是否允许缩放
                zoom: 1.2, // 默认显示级别
                layoutSize: '95%',
                layoutCenter: ['55%', '51.5%'],
                itemStyle: {
                  // areaColor: '#005DDC',
                  areaColor: 'rgba(0,27,95,0.4)',
                  borderColor: '#004db5',
                  borderWidth: 1
                },
                zlevel: 1,
                silent: true
              }
            ],
            series: [
              // map
              {
                geoIndex: 0,
                // coordinateSystem: 'geo',
                showLegendSymbol: true,
                type: 'map',
                roam: true,
                label: {
                  normal: {
                    show: false,
                    textStyle: {
                      color: '#fff'
                    }
                  },
                  emphasis: {
                    show: false,
                    textStyle: {
                      color: '#fff'
                    }
                  }
                },
    
                itemStyle: {
                  normal: {
                    borderColor: '#2ab8ff',
                    borderWidth: 1.5,
                    areaColor: '#12235c'
                  },
                  emphasis: {
                    areaColor: '#2AB8FF',
                    borderWidth: 0,
                    color: 'red'
                  }
                },
                map: 'sanya', // 使用
                data: customerBatteryCityData
                // data: this.difficultData //热力图数据   不同区域 不同的底色
              },
              // 柱状体的主干
              {
                type: 'lines',
                zlevel: 5,
                effect: {
                  show: false,
                  // period: 4, //箭头指向速度，值越小速度越快
                  // trailLength: 0.02, //特效尾迹长度[0,1]值越大，尾迹越长重
                  // symbol: 'arrow', //箭头图标
                  // symbol: imgDatUrl,
                  symbolSize: 5 // 图标大小
                },
                lineStyle: {
                  width: 20, // 尾迹线条宽度
                  color: 'rgb(22,255,255, .6)',
                  opacity: 1, // 尾迹线条透明度
                  curveness: 0 // 尾迹线条曲直度
                },
                label: {
                  show: 0,
                  position: 'end',
                  formatter: '245'
                },
                silent: true,
                data: lineData()
              },
              // 柱状体的顶部
              {
                type: 'scatter',
                coordinateSystem: 'geo',
                geoIndex: 0,
                zlevel: 5,
                label: {
                  show: true,
                  formatter: function () {
                    return `顶部label`
                  },
                  position: "top"
                },
                symbol: 'circle',
                symbolSize: [20, 10],
                itemStyle: {
                  color: 'rgb(22,255,255, 1)',
                  opacity: 1
                },
                silent: true,
                data: scatterData()
              },
              // 柱状体的底部
              {
                type: 'scatter',
                coordinateSystem: 'geo',
                geoIndex: 0,
                zlevel: 4,
                label: {
                  // 这儿是处理的
                  formatter: '{b}',
                  position: 'bottom',
                  color: '#fff',
                  fontSize: 12,
                  distance: 10,
                  show: true
                },
                symbol: 'circle',
                symbolSize: [20, 10],
                itemStyle: {
                  // color: '#F7AF21',
                  color: 'rgb(22,255,255, 1)',
                  opacity: 1
                },
                silent: true,
                data: scatterData2()
              },
              // 底部外框
              {
                type: 'scatter',
                coordinateSystem: 'geo',
                geoIndex: 0,
                zlevel: 4,
                label: {
                  show: false
                },
                symbol: 'circle',
                symbolSize: [40, 20],
                itemStyle: {
                    color: {
                    type: 'radial',
                    x: 0.5,
                    y: 0.5,
                    r: 0.5,
                    colorStops: [
                        {
                            offset: 0, color: 'rgb(22,255,255, 0)' // 0% 处的颜色
                        }, 
                        {
                            offset: .75, color: 'rgb(22,255,255, 0)' // 100% 处的颜色
                        },
                        {
                            offset: .751, color: 'rgb(22,255,255, 1)' // 100% 处的颜色
                        },
                        {
                            offset: 1, color: 'rgb(22,255,255, 1)' // 100% 处的颜色
                        }
                    ],
                    global: false // 缺省为 false
                },
    
                  opacity: 1
                },
                silent: true,
                data: scatterData2()
              }
            ]
          }
       myChart.setOption(option);
    })
    
      
    // 动态计算柱形图的高度（定一个max）
    function lineMaxHeight () {
        const maxValue = Math.max(...customerBatteryCityData.map(item => item.value))
        return 0.9/maxValue
    }
        // 柱状体的主干
    function lineData () {
        return customerBatteryCityData.map((item) => {
          return {
            coords: [geoCoordMap[item.name], [geoCoordMap[item.name][0], geoCoordMap[item.name][1] + item.value * lineMaxHeight()]]
          }
        })
    }
    // 柱状体的顶部
    function scatterData () {
        return customerBatteryCityData.map((item) => {
          return [geoCoordMap[item.name][0], geoCoordMap[item.name][1] + item.value * lineMaxHeight()]
        })
    }
    // 柱状体的底部
    function scatterData2 () {
        return customerBatteryCityData.map((item) => {
          return {
            name: item.name,
            value: geoCoordMap[item.name]
          }
        })
    }
}

