import os
import requests
import geopandas as gpd
import folium
import pandas as pd
from tqdm import tqdm

# =============================
# 配置部分
# =============================
MAP_DIR = "data"
PROVINCE_GEOJSON_URL = "https://biogeo.ucdavis.edu/data/gadm3.6/json/ITA_adm2.json"
PROVINCE_GEOJSON_PATH = os.path.join(MAP_DIR, "italy_provinces.geojson")
OUTPUT_HTML = "italy_map.html"

# 城市点数据（内嵌示例）
cities_data = {
    "name": ["Rome", "Milan", "Naples", "Turin", "Palermo"],
    "lat": [41.9028, 45.4642, 40.8518, 45.0732, 38.1157],
    "lon": [12.4964, 9.1899, 14.2681, 7.6803, 13.3615],
    "population": [2837000, 1372000, 967000, 877000, 674000]
}
cities_df = pd.DataFrame(cities_data)

# =============================
# 工具函数：自动下载地图数据
# =============================
def ensure_dir(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)

def download_file(url, local_path, chunk_size=1024):
    print(f"📥 开始下载地图数据: {url}")
    with requests.get(url, stream=True) as r:
        r.raise_for_status()
        total_size = int(r.headers.get('Content-Length', 0))
        progress_bar = tqdm(total=total_size, unit='iB', unit_scale=True)

        with open(local_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=chunk_size):
                if chunk:
                    f.write(chunk)
                    progress_bar.update(len(chunk))
        progress_bar.close()
    print(f"✅ 下载完成: {local_path}")

def check_existing_file(path):
    return os.path.isfile(path)

# =============================
# 主程序逻辑
# =============================
def main():
    ensure_dir(MAP_DIR)

    # 自动下载 GeoJSON 数据（如果不存在）
    if not check_existing_file(PROVINCE_GEOJSON_PATH):
        try:
            download_file(PROVINCE_GEOJSON_URL, PROVINCE_GEOJSON_PATH)
        except requests.exceptions.RequestException as e:
            print(f"❌ 下载失败，请手动下载或检查网络。错误信息：{e}")
            return
    else:
        print(f"📦 地图文件已存在：{PROVINCE_GEOJSON_PATH}")

    # 加载地理数据
    print("🗺️ 加载地图数据...")
    gdf = gpd.read_file(PROVINCE_GEOJSON_PATH)

    # 添加人口字段（模拟数据）
    gdf['population'] = pd.Series(range(100_000, len(gdf)*100_000+1, 100_000)).sample(frac=1).reset_index(drop=True)

    # 创建地图
    print("📍 创建地图...")
    m = folium.Map(location=[41.9028, 12.4964], zoom_start=6, tiles="cartodb positron")

    # 添加 choropleth 图层
    folium.Choropleth(
        geo_data=gdf,
        name='choropleth',
        data=gdf,
        columns=['NAME_2', 'population'],  # NAME_2 是省级名称字段
        key_on='feature.properties.NAME_2',
        fill_color='YlOrRd',
        fill_opacity=0.7,
        line_opacity=0.2,
        legend_name='Population by Province'
    ).add_to(m)

    # 添加交互式区域信息
    folium.GeoJson(
        gdf,
        tooltip=folium.features.GeoJsonTooltip(fields=['NAME_2', 'population'],
                                               aliases=['Province:', 'Population:']),
        popup=folium.features.GeoJsonPopup(fields=['NAME_2'])
    ).add_to(m)

    # 添加城市标记点
    for idx, row in cities_df.iterrows():
        folium.Marker(
            location=[row['lat'], row['lon']],
            popup=f"<b>{row['name']}</b><br>Population: {row['population']:,}",
            icon=folium.Icon(color='blue', icon='info-sign')
        ).add_to(m)

    # 添加图层控制
    folium.LayerControl().add_to(m)

    # 保存 HTML
    m.save(OUTPUT_HTML)
    print(f"✅ 地图已生成并保存为 {OUTPUT_HTML}")

# =============================
# 程序入口
# =============================
if __name__ == "__main__":
    main()