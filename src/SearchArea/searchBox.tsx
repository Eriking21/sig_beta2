"use client";
import { useState, useRef, useEffect, use, useMemo, useCallback } from "react";
import SearchItem from "./SearchItem";
import { mapInterface } from "@/Map/interface";

export default function SearchBox() {
  mapInterface.search.item = useRef<HTMLDivElement | null>(null);
  const [, setToogle] = useState(false);

  useEffect(() => {
    mapInterface.search.listeners.add(setToogle);
    return () => {
      mapInterface.search.listeners.delete(setToogle);
    };
  }, []);

  const items = mapInterface.objects
    .flat()
    ?.filter((point) =>
      point.attributes.identificação
        .toLowerCase()
        .includes(mapInterface.search.getValue())
    )
    .map((point, index) => {
      return (
        <SearchItem
          key={index}
          {...{ ...point, activeNode: mapInterface.search.item!, index }}
        />
      );
    });

  // console.log("rebuild",map.objects,items);
  return (
    <div className="scrollable" style={{ padding: "0 1.25rem 0 1.75rem" }}>
      <div>{items}</div>
    </div>
  );
}
