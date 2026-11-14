import { expect, it } from "vitest";
import {
  buildTulanpediaSearch,
  clearTulanpediaSearch,
  isTulanpediaSearch,
  readTulanpediaTab,
} from "../viewmodels/tulanpedia-tab";

it("CA-63 tulanpedia-tab: tab ausente o no válido abre Solicitudes; tab=published abre Publicadas", () => {
  expect(readTulanpediaTab("")).toBe("requests");
  expect(readTulanpediaTab("?section=tulanpedia")).toBe("requests");
  expect(readTulanpediaTab("?section=tulanpedia&tab=otra")).toBe("requests");
  expect(readTulanpediaTab("?section=tulanpedia&tab=requests")).toBe("requests");
  expect(readTulanpediaTab("?section=tulanpedia&tab=published")).toBe("published");
  expect(isTulanpediaSearch("?section=tulanpedia&tab=published")).toBe(true);
  expect(isTulanpediaSearch("?section=news")).toBe(false);
  expect(buildTulanpediaSearch("requests")).toBe("?section=tulanpedia&tab=requests");
  expect(buildTulanpediaSearch("published")).toBe("?section=tulanpedia&tab=published");
});

it("CA-63 tulanpedia-tab: al salir se quitan section y tab", () => {
  expect(clearTulanpediaSearch("?section=tulanpedia&tab=published")).toBe("");
  expect(clearTulanpediaSearch("?x=1&section=tulanpedia&tab=requests")).toBe("?x=1");
});
