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
map.on("click", function (evt) {
    var lat = evt.latLng.getLat().toFixed(6);
    var lng = evt.latLng.getLng().toFixed(6);
    console.log(lat + ", " + lng);
});
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

let isChange = false;
let nowButton = null;
const areaButtons = document.getElementById("area");

let ws1;
let ws2;
let ws3;
let ws4;
let sheet1;
let sheet2;
let sheet3;
let sheet4;
let marker = [];
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

            areaButtons.innerHTML = "";
            [
                {
                    区域: "三亚",
                    区域代码: ["460203", "460204", "460202", "460205"],
                    all: true
                },
                ...ws2
            ].map((v) => {
                const dom = document.createElement("button");
                dom.innerHTML = v["区域"];
                dom.style.margin = "0 8px";
                areaButtons.appendChild(dom);
                // areaButtons.innerHTML += `<but"padding: 0 12px"ton class="area" style="padding: 0 12px">${v['区域']}</button>`
                console.log(dom);
                dom.onclick = (e) => {
                    console.log(e);
                    nowButton = v["区域"];
                    legend.innerHTML = "";
                    // 先取消选中
                    polygons?.remove(
                        polygons?.getGeometries()?.map((item) => item.id)
                    );
                    // 单独选中
                    if (Array.isArray(v["区域代码"])) {
                        v["区域代码"].map((c) => findBorder(c));
                    } else {
                        findBorder(v["区域代码"]);
                    }
                    flag = true;
                    if (isChange) {
                        addAddressMarker(
                            "网点规模",
                            ws4,
                            v.all ? null : v["区域"]
                        );
                    } else {
                        addAddressMarker("类型", ws3, v.all ? null : v["区域"]);
                    }
                };
            });

            addAddressMarker("类型", ws3);

            // initEchart()
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

const legend = document.getElementById("legend");
const changeButton = document.getElementById("changeButton");
const adText = document.getElementById("adText");
changeButton.onclick = () => {
    if (!ws1) return;
    legend.innerHTML = "";
    console.log(isChange);
    if (!isChange) {
        isChange = true;
        addAddressMarker("网点规模", ws4, nowButton);
    } else {
        addAddressMarker("类型", ws3, nowButton);
        isChange = false;
    }
};

function addAddressMarker(keyName, ws, areaName) {
    if (marker?.length) {
        marker.map((v) => {
            v.setMap(null);
        });
        marker = [];
    }

    ws.map((v) => {
        legend.innerHTML += `<div><img src="./icon/${encodeURIComponent(
            v["颜色"]
        )}.png" /><span>${v[keyName]}</span></div>`;
    });

    const mapData = {};
    const filterData = ws1.filter((v) => !areaName || v["区域"] === areaName);
    filterData.map((v) => {
        const loc = v["经纬度"];
        if (loc && !loc.includes("-")) {
            const dot = loc.split(", ");
            const type = v[keyName];
            const color = ws.find((w) => w[keyName] === type)?.["颜色"];
            if (color) {
                if (!mapData[color]?.loc?.length) {
                    mapData[color] = {
                        loc: [],
                        address: v["店名"] + "-" + v["营业地址"]
                    };
                }

                mapData[color].loc.push(dot);
            }
        }
    });
    console.log(mapData);
    // 根据颜色生成点数据
    for (const key in mapData) {
        if (Object.hasOwnProperty.call(mapData, key)) {
            const dotes = mapData[key].loc;
            const current = new TMap.MultiMarker({
                id: "marker" + key,
                map: map,
                styles: {
                    // 点标记样式
                    marker: new TMap.MarkerStyle({
                        width: 8, // 样式宽
                        height: 8, // 样式高
                        anchor: { x: 4, y: 4 }, // 描点位置
                        src: "./icon/" + encodeURIComponent(key) + ".png"
                    })
                },
                geometries: dotes
                    .filter((v) => v[0] && v[1])
                    .map((v) => {
                        return {
                            // 标记位置(纬度，经度，高度)
                            position: new TMap.LatLng(v[0], v[1]),
                            styleId: "marker"
                        };
                    })
            });
            current.on("click", (evt) => {
                console.log(evt);
                adText.innerHTML = mapData[key].address;
            });
            marker.push(current);
        }
    }
}
