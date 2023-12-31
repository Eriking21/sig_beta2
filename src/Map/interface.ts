"use client";
import MapView_ from "@arcgis/core/views/MapView";
import Map_ from "@arcgis/core/Map";
import Point_ from "@arcgis/core/geometry/Point";
import Polyline_ from "@arcgis/core/geometry/Polyline";
import FeatureLayer_ from "@arcgis/core/layers/FeatureLayer";
import SimpleRenderer_ from "@arcgis/core/renderers/SimpleRenderer";
//import UniqueValueRenderer_ from "@arcgis/core/renderers/UniqueValueRenderer";
import PictureMarkerSymbol_ from "@arcgis/core/symbols/PictureMarkerSymbol";
import SimpleMarkerSymbol_ from "@arcgis/core/symbols/SimpleMarkerSymbol";
import SimpleLineSymbol_ from "@arcgis/core/symbols/SimpleLineSymbol";
//import CIMSymbol_ from "@arcgis/core/symbols/CIMSymbol";
import Graphic_ from "@arcgis/core/Graphic";
import ColorVariable_ from "@arcgis/core/renderers/visualVariables/ColorVariable";
import { loadModules } from "esri-loader";
import { PowerItem, basemap } from "../utility/options";
import { erimServerData, erimClientData, Info } from "@/app/api/data/types";

import { MutableRefObject, useEffect } from "react";
import Collection_ from "@arcgis/core/core/Collection";
//import Layer_ from "@arcgis/core/layers/Layer";
//import Collection from "@arcgis/core/core/Collection";

type MapInterface = {
  Point: typeof Point_ | undefined;
  Graphic: typeof Graphic_ | undefined;
  Polyline: typeof Polyline_ | undefined;
  objects: Info[][];
  view: MapView_ | undefined;
  layers: Collection_<FeatureLayer_> | undefined;
  afterLoad?: () => void | Promise<void>;
  promises: {
    [key: number | string]: Promise<void>;
  };
  updateFeatures: (response: erimServerData) => Promise<void>;
  loadMap: ([Map, MapView]: [typeof Map_, typeof MapView_]) => Promise<void>;
  useMap: () => void;
  buildPopPup: () => void;
  search: {
    watcher: __esri.WatchHandle | undefined;
    input: HTMLInputElement | undefined;
    item: MutableRefObject<HTMLDivElement | null> | undefined;
    listeners: Set<(setToogle: (toogle: boolean) => boolean) => void>;
    getValue: () => string;
    clear: () => void;
    update: () => void;
  };
};

const mapInterface: MapInterface = {
  Point: undefined,
  Graphic: undefined,
  Polyline: undefined,
  objects: [],
  view: undefined,
  layers: undefined,
  search: {
    watcher: undefined as __esri.WatchHandle | undefined,
    input: undefined as HTMLInputElement | undefined,
    item: undefined as MutableRefObject<HTMLDivElement | null> | undefined,
    listeners: new Set<(setToogle: (toogle: boolean) => boolean) => void>(),
    getValue: () => mapInterface.search?.input?.value ?? "",
    clear: () => {
      if (mapInterface.search?.input || false) {
        mapInterface.search!.input!.value = "";
        mapInterface.search.update();
      }
    },
    update: () => mapInterface.search.listeners.forEach((f) => f((i) => !i)),
  },
  promises: {},
  updateFeatures: async (response) => {
    const data = new erimClientData(response);
    mapInterface.objects = [data.subs, data.trafos.flat()];
    const lineColors: { value: number; color: number[] | string }[] = [];
    function addColor({
      FID,
      cor_da_linha,
    }: {
      FID: number;
      cor_da_linha: number[] | string;
    }) {
      const index = lineColors.findIndex(({ value }) => value == FID);
      if (index != -1) {
        lineColors[index] = {
          value: FID,
          color: cor_da_linha,
        };
      } else {
        lineColors.push({
          value: FID,
          color: cor_da_linha,
        });
      }
      return FID;
    }
    const loadFeatures = ([
      FeatureLayer,
      Point,
      Polyline,
      SimpleRenderer,
      //UniqueValueRenderer,
      PictureMarkerSymbol,
      SimpleMarkerSymbol,
      SimpleLineSymbol,
      //CIMSymbol,
      Graphic,
      ColorVariable,
    ]: FeaturesT): FeatureLayer_[] => {
      mapInterface.Point = Point;
      mapInterface.Graphic = Graphic;
      mapInterface.Polyline = Polyline;
      //if (!data.trafos || !data.trafos[0]) return;
      return [
        new FeatureLayer({
          title: "lines",
          objectIdField: "FID",
          fields: getLineFields(),
          source: [
            ...data.subs.flatMap((sub) => {
              addColor(sub.attributes);
              console.log(data.trafos);
              return data.trafos[sub.attributes.FID]?.map(
                ({ attributes: trafo, geometry: trafo_geometry }) => ({
                  geometry: new Polyline({
                    paths: [
                      [
                        [sub.geometry.longitude, sub.geometry.latitude],
                        [trafo_geometry.longitude, trafo_geometry.latitude],
                      ],
                    ],
                  }),
                  attributes: {
                    identificação: "alimentação " + trafo.identificação,
                    FID: `${trafo.FID}`,
                    power: trafo.Potência,
                    lineColor: sub.attributes.FID,
                  },
                })
              );
            }),
            ...data.CON_SE.map(({ 0: sub_0, 1: sub_1, power }) => {
              const s0 = data.subs.at(sub_0)!;
              const s1 = data.subs.at(sub_1)!;
              return {
                geometry: new Polyline({
                  paths: [
                    [
                      [s0.geometry.longitude, s0.geometry.latitude],
                      [s1.geometry.longitude, s1.geometry.latitude],
                    ],
                  ],
                }),
                attributes: {
                  identificação: `de ${s0.attributes.identificação} para ${s1.attributes.identificação}`,
                  FID: `${s0.attributes.FID} to ${s1.attributes.FID}`,
                  power: power,
                  lineColor: addColor({
                    FID: 2 * 21,
                    cor_da_linha: [255, 0, 0],
                  }),
                },
              };
            }),
            ...data.CON_TRAFO.map(({ 0: trafo_0, 1: trafo_1, power }) => {
              const T0 = data.trafos.at(trafo_0[0])!.at(trafo_0[1])!;
              const T1 = data.trafos.at(trafo_1[0])!.at(trafo_1[1])!;
              return {
                geometry: new Polyline({
                  paths: [
                    [
                      [T0.geometry.longitude, T0.geometry.latitude],
                      [T1.geometry.longitude, T1.geometry.latitude],
                    ],
                  ],
                }),
                attributes: {
                  identificação: `de ${T0.attributes.identificação} para ${T1.attributes.identificação}`,
                  FID: `${T0.attributes.FID} to ${T1.attributes.FID}`,
                  power: power,
                  lineColor: addColor({
                    FID: 2 * 42,
                    cor_da_linha: [255, 0, 255],
                  }),
                },
              };
            }),
          ],
          renderer: new SimpleRenderer({
            symbol: new SimpleLineSymbol({
              width: 3,
            }),
            visualVariables: [
              new ColorVariable({
                field: "lineColor",
                stops: lineColors,
              }),
            ],
          }),
        }),
        ...mapInterface.objects.flatMap((vec) => {
          const fields = getFields(vec[0].attributes);
          const type = vec[0].attributes.ObjectType_id;
          return [
            new FeatureLayer({
              title: "background",
              objectIdField: "FID",
              fields: fields,
              source: vec.map((item) => {
                return {
                  geometry: new Point(item.geometry),
                  attributes: item.attributes,
                };
              }),
              renderer: new SimpleRenderer({
                symbol: new SimpleMarkerSymbol({
                  color: [255, 255, 255],
                  size: 16,
                }),
              }),
            }),
            new FeatureLayer({
              title: "type",
              objectIdField: "FID",
              fields: fields,
              source: vec.map((item) => ({
                geometry: new Point(item.geometry),
                attributes: item.attributes,
              })),
              renderer: new SimpleRenderer({
                symbol: new PictureMarkerSymbol({
                  url: PowerItem[type].src,
                  color: [128, 128, 255],
                  width: 14,
                  height: 14,
                }),
              }),
            }),
          ];
        }),
      ];
    };

    return loadModules<FeaturesT>(FeaturesUrl, {
      css: true,
    })
      .then(loadFeatures)
      .catch((err) => {
        console.error("Erro ao carregar features", err);
        return [] as ReturnType<typeof loadFeatures>;
      })
      .then(async (featuresLayers) => {
        if (
          featuresLayers.length != 0 &&
          Object.keys(mapInterface.promises).includes("loadMap")
        ) {
          await mapInterface.promises["loadMap"];
          mapInterface.layers?.removeAll();
          mapInterface.layers?.addMany(featuresLayers);
          mapInterface.search.update();
          await mapInterface.promises["ready"];
          mapInterface.buildPopPup();
        }
      });
  },

  buildPopPup: () => {
    mapInterface.layers
      ?.filter((fl) => fl.fields !== undefined)
      .forEach((fl) => {
        fl.popupTemplate = fl.createPopupTemplate({
          ignoreFieldTypes: ["global-id", "guid", "oid"],
        });
      });
    mapInterface.layers?.forEach((fl) => {
      //console.log(fl.fields);
      fl.popupTemplate.title = "{identificação}";
    });
    mapInterface.view?.popup.watch(
      ["visible", "selectedFeature"],
      updateSelection
    );
    mapInterface.promises["firstBuild"] ??= Promise.resolve();
  },
  loadMap: async ([Map, MapView]: [
    typeof Map_,
    typeof MapView_
  ]): Promise<void> => {
    //console.log("buildMap"); //it will thrown an error if called first
    const view = new MapView({
      container: "map",
      map: new Map({ basemap: basemap[0].title, layers: mapInterface.layers }),
      center: [13.234444, -8.838333],
      zoom: 13,
    });
    mapInterface.view = view;
    mapInterface.layers = view.map.layers as any;
    mapInterface.promises["ready"] = view?.when();
    mapInterface.promises["ready"].then(mapInterface.afterLoad);
    return;
  },
  useMap: () => {
    useEffect(() => {
      const updateFeatures = () =>
        (mapInterface.promises["updateFeatures"] = fetch(
          document.location.origin + "/api/data",
          {
            method: "GET",
            next: { tags: ["update_features"] },
            cache: "no-store",
          }
        )
          .then((response) => response.json() as Promise<erimServerData>)
          .then(mapInterface.updateFeatures));

      Promise.all([
        (mapInterface.promises["loadMap"] = loadModules<
          [typeof Map_, typeof MapView_]
        >(ArcGisMapPath, { css: true })
          .then(mapInterface.loadMap)
          .catch((err: any) => console.error("Erro no Map", err))),
        updateFeatures(),
      ]);

      const event = new ErimEvent(
        document.location.origin + "/api/data/refresh",
        {
          update: function (msg) {
            console.log("update", msg);
            updateFeatures();
          },
        }
      );
      return () => {
        event.clean();
        mapInterface.promises = {};
      };
    }, []);
  },
};
const ArcGisMapPath = ["esri/Map", "esri/views/MapView"];

type FeaturesT = [
  typeof FeatureLayer_,
  typeof Point_,
  typeof Polyline_,
  typeof SimpleRenderer_,
  //typeof UniqueValueRenderer_,
  typeof PictureMarkerSymbol_,
  typeof SimpleMarkerSymbol_,
  typeof SimpleLineSymbol_,
  //typeof CIMSymbol_,
  typeof Graphic_,
  typeof ColorVariable_
];

const FeaturesUrl = [
  "esri/layers/FeatureLayer",
  "esri/geometry/Point",
  "esri/geometry/Polyline",
  "esri/renderers/SimpleRenderer",
  //"esri/renderers/UniqueValueRenderer",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  //"esri/symbols/CIMSymbol",
  "esri/Graphic",
  "esri/renderers/visualVariables/ColorVariable",
];
export default mapInterface.useMap;
export { mapInterface };

export function getLineFields(): __esri.FieldProperties[] | undefined {
  return [
    {
      name: "lineColor",
      type: "guid",
    },
    {
      name: "FID",
      type: "string",
    },
    {
      name: "power",
      alias: "potência",
      type: "string",
    },
    {
      name: "identificação",
      type: "global-id",
    },
  ];
}
export function getFields<T extends {}>(
  attributes: T
): __esri.FieldProperties[] | undefined {
  return Object.entries(attributes).map(([key, value]) => ({
    name: key,
    alias: key,
    type: typeof value === "number" ? "integer" : "string",
  }));
}

export function updateSelection(some: any) {
  "use client";
  if (some === null) return;
  const id: string =
    mapInterface.view?.popup.selectedFeature?.attributes?.identificação ?? "";
  mapInterface.search.clear();
  if (
    some === false ||
    (mapInterface.search.item?.current?.classList.contains("active") &&
      (mapInterface.search.item?.current?.childNodes.item(1) as HTMLSpanElement)
        .innerText !== id)
  ) {
    mapInterface.search.item?.current?.classList.remove("active");
  }

  mapInterface.search.item?.current?.parentNode?.childNodes.forEach((child) => {
    if (
      (child.childNodes.item(1) as HTMLSpanElement).innerText === id &&
      !(child as HTMLDivElement).classList.contains("active") &&
      some !== false
    ) {
      (child as HTMLDivElement).classList.add("active");
      mapInterface.search.item!.current = child as HTMLDivElement;
      mapInterface.search.item!.current!.scrollIntoView({ behavior: "smooth" });
      return;
    }
  });
}
type EventListeners = {
  [key: string]: (this: EventSource, ev: MessageEvent) => any;
};

class ErimEvent {
  source: EventSource;
  listeners: EventListeners;
  retries = 0;
  readonly maxRetries = 3;
  clean() {
    this.source.close();
  }
  constructor(url: EventSource["url"], listeners: EventListeners = {}) {
    const self = this;
    this.source = new EventSource(url);
    this.listeners = {
      ...listeners,
      open: function (this: EventSource, ev: MessageEvent<any>) {
        listeners["open"]?.call(self.source, ev);
        Object.entries(self.listeners).forEach(([key, value]) => {
          self.source.addEventListener(key, value);
        });
      },
      close: function (this: EventSource, ev: MessageEvent<any>) {
        listeners["close"]?.call(self.source, ev);
        Object.entries(self.listeners).forEach(([key, value]) => {
          self.source.removeEventListener(key, value);
        });
      },
      retry: function (this: EventSource, ev: MessageEvent<any>) {
        listeners["retry"]?.call(self.source, ev);
        if (self.retries == self.maxRetries) self.retries = 0;
        self.listeners["close"]!.call(self.source, ev);
        self.source = new EventSource(self.source.url);
        self.listeners["open"]!.call(self.source, ev);
      },
      error: function (this: EventSource, ev: MessageEvent<any>) {
        listeners["error"]?.call(self.source, ev);
        if (self.retries++ < self.maxRetries) {
          setTimeout(() => {
            self.listeners["reset"]!.call(self.source, ev);
          }, 3000);
        } else {
          listeners["fail"]?.call(self.source, ev);
          // it will call self.listeners["close"]!.call(self.source, ev)?
          self.source.close();
        }
      },
    };
    Object.entries(self.listeners).forEach(([key, value]) => {
      self.source.addEventListener(key, value);
    });
  }
}
/*
const event: {
  source: EventSource;
  listeners: { [key: string]: (this: EventSource, ev: MessageEvent) => any };
  clean: () => void;
} = {
  source: new EventSource(document.location.origin + "/api/data/refresh"),
  clean: () => {
    Object.entries(event.listeners).forEach(([key, value]) => {
      event.source.removeEventListener(key, value);
    });
    event.source.close();
  },
  listeners: {
    open: function (this: EventSource, ev: MessageEvent<any>) {
      Object.entries(event.listeners).forEach(([key, value]) => {
        this.addEventListener(key, value);
      });
    },
    update: function (this: EventSource, ev: MessageEvent<any>) {
      console.log("update", this.url, ev);
    },
    close: function (this: EventSource, ev: MessageEvent<any>) {
      event.clean();
    },
    reset: function (this: EventSource, ev: MessageEvent<any>) {
      event.listeners["close"]!.call(this, ev);
      event.source = new EventSource(event.source.url);
      event.listeners["open"]!.call(this, ev);
    },
    error: function (this: EventSource, ev: MessageEvent<any>) {
      event.listeners["reset"]!.call(this, ev);
    },
  },
};
*/
