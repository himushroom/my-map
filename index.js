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
function findBorder() {
    polygons.remove(polygons.getGeometries().map((item) => item.id));
    district
        .search({ keyword: "460203" })
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
                    map.fitBounds(bounds);
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
// findBorder();

// 文件
var geocoder = new TMap.service.Geocoder(); // 新建一个正逆地址解析类
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
            const wsname1 = workbook.SheetNames[0];
            const wsname2 = workbook.SheetNames[1];
            const wsname3 = workbook.SheetNames[2];
            const ws1 = XLSX.utils.sheet_to_json(workbook.Sheets[wsname1]);
            const ws2 = XLSX.utils.sheet_to_json(workbook.Sheets[wsname2]);
            const ws3 = XLSX.utils.sheet_to_json(workbook.Sheets[wsname3]);
            const sheet1 = workbook.Sheets[wsname1];
            const sheet2 = workbook.Sheets[wsname2];
            const sheet3 = workbook.Sheets[wsname3];

            // let output = document.getElementById("output")
            console.log(ws1);
            console.log(ws2);
            console.log(ws3);
            const mapData = {};
            ws1.map(v => {
                const loc = v['经纬度']
                if (loc && !loc.includes('-')) {
                    const dot = loc.split(', ')
                    const type = v['类型']
                    const color = ws3.find(w => w['类型'] === type)?.['颜色']

                    if (color) {
                        if (mapData[color]?.length) {
                            mapData[color].push(dot)
                        } else {
                            mapData[color] = [dot]
                        }
                    }
                }
            })
            console.log(mapData)
            for (const key in mapData) {
                if (Object.hasOwnProperty.call(mapData, key)) {
                    const dotes = mapData[key];
                    var marker = new TMap.MultiMarker({
                            map: map,
                            styles: {
                                // 点标记样式
                                marker: new TMap.MarkerStyle({
                                    width: 12, // 样式宽
                                    height: 12, // 样式高
                                    anchor: { x: 6, y: 6 }, // 描点位置
                                    src: './icon/' + encodeURIComponent(key) + '.png'
                                })
                            },
                            geometries: dotes.map(v => {
                                return {
                                    // 标记位置(纬度，经度，高度)
                                    position: new TMap.LatLng(v[0], v[1]),
                                    "styleId": 'marker',
                                    id: "marker"
                                }
                            })
                        });
                }
            }
            
            // const promise = new Promise((resolve) => {
            //     const len = ws1.length;
                // sheet1["P1"].v = "经纬度";
                // const m = new Map();

                // function digui(num){
                //     if (num >= ws1.length) {
                //         console.log('导出')
                //         resolve()
                //         return
                //     }
                //     const v = ws1[num]

                //     const address = v["营业地址"];
                //     const location = v["经纬度"];
                //     if (!address) {
                //         sheet1[`P${num + 2}`].v = "";
                //         digui(num+1)
                //     } else if (location && !location.includes("-")) {
                //         m.set(address, location);
                //         digui(num+1)
                //     } else if (m.get(address)) {
                //         sheet1[`P${num + 2}`].v = m.get(address);
                //         digui(num+1)
                //     } else {
                //         geocoder
                //             .getLocation({ address: address })
                //             .then(async (result) => {
                //                 await waitTime(200)
                //                 console.log(address);
                //                 console.log(result);
                //                 // 

                //                 sheet1[`P${num + 2}`].v =
                //                     result.result.location.toString();
                //                 digui(num+1)
                //             })
                //             .catch(() => {
                //                 digui(num+1)
                //             });
                //     }
                // }
                // digui(0)
            // });
            // promise.then(() => {
                // console.log(location);
                // var marker = new TMap.MultiMarker({
                //     map: map,
                //     styles: {
                //         // 点标记样式
                //         marker: new TMap.MarkerStyle({
                //             width: 12, // 样式宽
                //             height: 12, // 样式高
                //             anchor: { x: 10, y: 30 } // 描点位置
                //         })
                //     },
                //     geometries: location.map(v => {
                //         // 点标记数据数组
                //         return {
                //             // 标记位置(纬度，经度，高度)
                //             position: new TMap.LatLng(v[0], v[1]),
                //             id: "marker"
                //         }
                //     })
                // });
                // var markerCluster = new TMap.MarkerCluster({
                //     id: 'cluster', //图层id
                //     map: map,       //设置点聚合显示在哪个map对象中（创建map的段落省略）
                //     minimumClusterSize: 2,  //最小聚合点数：2个
                //     // styles: {
                //     //     default: new TMap.MarkerStyle({
                //     //       'width': 34,
                //     //       'height': 42,
                //     //       'anchor': {
                //     //         x: 17,
                //     //         y: 21,
                //     //       },
                //     //       'src': 'https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/marker_blue.png',
                //     //     }),
                //     //   },
                //     geometries: location.map(v => {
                //         return {position: new TMap.LatLng(v[0], v[1])}
                //     }),
                //     zoomOnClick: true,  //点击聚合数字放大展开
                //     gridSize: 60,       //聚合算法的可聚合距离，即距离小于该值的点会聚合至一起，默认为60，以像素为单位
                //     averageCenter: false, //每个聚和簇的中心是否应该是聚类中所有标记的平均值
                //     maxZoom: 16 //采用聚合策略的最大缩放级别，若地图缩放级别大于该值，则不进行聚合，标点将全部被展开
                // });
                // var wbout = XLSX.write(workbook, {
                //     bookType: "xlsx",
                //     type: "binary"
                // });
                // function s2ab(s) {
                //     var buf = new ArrayBuffer(s.length);
                //     var view = new Uint8Array(buf);
                //     for (var i = 0; i < s.length; i++)
                //         view[i] = s.charCodeAt(i) & 0xff;
                //     return buf;
                // }
                // saveAs(
                //     new Blob([s2ab(wbout)], {
                //         type: "application/octet-stream"
                //     }),
                //     "output.xlsx"
                // );
            // });
        } catch (e) {
            console.log(e);
        }
    };
    fileReader.readAsBinaryString(files[0]);
}

dom.addEventListener("change", (e) => {
    readExcel(e);
});
