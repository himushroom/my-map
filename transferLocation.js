function transferExport(workbook, ws1, sheet1){
    var geocoder = new BMapGL.Geocoder(); // 新建一个正逆地址解析类
    const promise = new Promise((resolve) => {
        const len = ws1.slice(0, 1).length;
        // const len = 100;
        // sheet1["P1"].v = "经纬度";
        const m = new Map();
    
        function digui(num, r){
            if (num >= len) {
                console.log('导出')
                r()
                return
            }
            const v = ws1[num]
            
            let flag = false
            const shopName = v["店名"];
            let address = v["营业地址"];
            if (address && !address.includes('三亚') && !address.includes('海南')) {
                address = '海南省三亚市' + address

                sheet1[`F${num + 2}`].v = address;
                flag = true
            }
            const location = v["经纬度"];
            if (!address) {
                sheet1[`P${num + 2}`].v = "";
                digui(num+1, r)
            } else if (location && !location.includes("-") && !flag) {
                m.set(address, location);
                digui(num+1, r)
            } else if (m.get(address)) {
                console.log('get:' + m.get(address));
                sheet1[`P${num + 2}`].v = m.get(address);
                digui(num+1, r)
            } else {
                geocoder
                    .getPoint(address + shopName, async (point) => {
                        console.log(point)
                        if (point) {
                            await waitTime(200)
                            // convertBaiduToTencent()
                            // sheet1[`P${num + 2}`].v =
                            //     result.result.location.toString();
                            digui(num+1, r)
                        } else{
                            sheet1[`P${num + 2}`].v = '该地址拿不到数据';
                            digui(num+1, r)
                        }
                    }, '海南省')
                    // .catch((e) => {
                    //     console.log(e)
                    //     sheet1[`P${num + 2}`].v = '该地址拿不到数据';
                    //     digui(num+1, r)
                    // });
            }
        }
        digui(0, resolve)
    });
    
    promise.then(() => {
        var wbout = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "binary"
        });
        function s2ab(s) {
            var buf = new ArrayBuffer(s.length);
            var view = new Uint8Array(buf);
            for (var i = 0; i < s.length; i++)
                view[i] = s.charCodeAt(i) & 0xff;
            return buf;
        }
        saveAs(
            new Blob([s2ab(wbout)], {
                type: "application/octet-stream"
            }),
            "output.xlsx"
        );
    })
}

const waitTime = (time) => {
    return new Promise((r) => {
        setTimeout(() => {
            r();
        }, time);
    });
};

// 百度地图坐标系转换为腾讯地图坐标系
function convertBaiduToTencent(latitude, longitude) {
    var x = longitude - 0.0065;
    var y = latitude - 0.006;
    var z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * Math.PI);
    var theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * Math.PI);
    var tencentLng = z * Math.cos(theta);
    var tencentLat = z * Math.sin(theta);
    return [tencentLat, tencentLng];
  }