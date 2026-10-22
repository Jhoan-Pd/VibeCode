import { describe, expect, it } from "vitest";
import { agruparPor, contarPor, omitir, unicosPor } from "@/lib/colecciones";
import { mapConConcurrencia } from "@/lib/concurrencia";

describe("colecciones", () => {
  it("omitir quita solo las claves pedidas y no muta el original", () => {
    const fila = { id: "x", analisisId: "a", titulo: "t", orden: 0 };
    expect(omitir(fila, ["id", "analisisId"])).toEqual({ titulo: "t", orden: 0 });
    expect(fila.id).toBe("x");
  });

  it("unicosPor conserva el primero de cada clave y el orden", () => {
    const r = unicosPor(["Async", "map", "async", "Map", "fetch"], (x) => x.toLowerCase());
    expect(r).toEqual(["Async", "map", "fetch"]);
  });

  it("agruparPor mantiene el orden de claves y elementos", () => {
    const g = agruparPor([{ c: "b", n: 1 }, { c: "a", n: 2 }, { c: "b", n: 3 }], (x) => x.c);
    expect([...g.keys()]).toEqual(["b", "a"]);
    expect(g.get("b")?.map((x) => x.n)).toEqual([1, 3]);
  });

  it("contarPor cuenta apariciones", () => {
    expect(Object.fromEntries(contarPor(["py", "js", "py"], (x) => x))).toEqual({ py: 2, js: 1 });
  });
});

describe("mapConConcurrencia", () => {
  it("conserva el orden y nunca supera el límite de tareas simultáneas", async () => {
    let activas = 0;
    let maximo = 0;
    const r = await mapConConcurrencia([30, 5, 20, 1, 10], 2, async (ms, i) => {
      activas++;
      maximo = Math.max(maximo, activas);
      await new Promise((ok) => setTimeout(ok, ms));
      activas--;
      return i * 10;
    });
    expect(r).toEqual([0, 10, 20, 30, 40]);
    expect(maximo).toBe(2);
  });

  it("funciona con listas vacías y límites mayores que la lista", async () => {
    expect(await mapConConcurrencia([], 3, async (x) => x)).toEqual([]);
    expect(await mapConConcurrencia([1, 2], 10, async (x) => x * 2)).toEqual([2, 4]);
  });
});
