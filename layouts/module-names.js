// Approved copy: コピー/2026-10-10-家具モジュールの名前の案.md (final table).
export const moduleNames={
  "seat": {
    "ja": "純正セカンドシート",
    "noteJa": "",
    "en": "Original second-row seat",
    "noteEn": ""
  },
  "i-seat": {
    "ja": "キャンピングカー用シート",
    "noteJa": "フラットにも反転にもできる",
    "en": "Camper seat",
    "noteEn": "Folds flat, swivels to face rear"
  },
  "front-module": {
    "ja": "フロントキッチン(合板)",
    "noteJa": "冷蔵庫・シンク・スツール付き",
    "en": "Front kitchen (Plywood)",
    "noteEn": "Fridge, sink and stool"
  },
  "aluminum-front-kitchen": {
    "ja": "フロントキッチン(アルミ)",
    "noteJa": "冷蔵庫・シンク・収納付き",
    "en": "Front kitchen (Aluminium)",
    "noteEn": "Fridge, sink and storage"
  },
  "side-cabinet": {
    "ja": "細身のサイドキャビネット(合板)",
    "noteJa": "テーブル付き",
    "en": "Slim side cabinet (Plywood)",
    "noteEn": "With flip-up table"
  },
  "simple-side-cabinet": {
    "ja": "シンプルサイドキャビネット(アルミ)",
    "noteJa": "収納付き",
    "en": "Simple side cabinet (Aluminium)",
    "noteEn": "With storage"
  },
  "aluminum-side-cabinet": {
    "ja": "シンク付きキッチンキャビネット(アルミ)",
    "noteJa": "Iシートと組み合わせると8ナンバー登録に対応",
    "en": "Kitchen cabinet with sink (Aluminium)",
    "noteEn": "With the camper seat, eligible for 8-number registration"
  },
  "active-side-cabinet": {
    "ja": "冷蔵庫・シャワー付きサイドキャビネット(アルミ)",
    "noteJa": "大型冷蔵庫",
    "en": "Side cabinet with fridge and shower (Aluminium)",
    "noteEn": "Large fridge"
  },
  "slide-bed": {
    "ja": "シンプルスライドベッド(合板)",
    "noteJa": "横に広がる",
    "en": "Simple slide bed (Plywood)",
    "noteEn": "Extends sideways"
  },
  "lounge-slide-bed": {
    "ja": "収納付きスライドベッド(合板)",
    "noteJa": "横に広がる・後部と室内側に引き出し",
    "en": "Slide bed with storage (Plywood)",
    "noteEn": "Extends sideways; drawers at the rear and inside"
  },
  "aluminum-bed": {
    "ja": "Hexaオリジナルベッド(アルミ)",
    "noteJa": "前後が別々に広がる",
    "en": "Hexa original bed (Aluminium)",
    "noteEn": "Front and rear extend separately"
  },
  "lounge-bed": {
    "ja": "ラウンジベッド(合板)",
    "noteJa": "対面ソファ・後部に大収納",
    "en": "Lounge bed (Plywood)",
    "noteEn": "Facing sofa; big rear storage"
  },
  "two-side-bed": {
    "ja": "スライド付き両サイドベッド(合板)",
    "noteJa": "中央が通路・後部に引き出し",
    "en": "Twin side beds with rear slide (Plywood)",
    "noteEn": "Centre aisle; rear pull-out slide"
  },
  "aircon-cube-air460b": {
    "ja": "後付けエアコン CUBE AIR460B",
    "noteJa": "",
    "en": "Add-on air conditioner CUBE AIR460B",
    "noteEn": ""
  },
  "ceiling-lights": {
    "ja": "天井ダウンライト",
    "noteJa": "6灯",
    "en": "Ceiling downlights",
    "noteEn": "6 lights"
  },
  "tailgate-lights": {
    "ja": "バックドアライト",
    "noteJa": "2灯",
    "en": "Tailgate lights",
    "noteEn": "2 lights"
  }
};
export const moduleName=(key,language="ja")=>moduleNames[key]?.[language==="en"?"en":"ja"];
