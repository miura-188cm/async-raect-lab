import { Suspense, use } from "react";

export const HomePage = () => {
  return (
    <div>
      <Suspense fallback={<div>loading....</div>}>
        <LazyComponents />
      </Suspense>
    </div>
  );
};

const pokemonPromise = fetch("https://pokeapi.co/api/v2/pokemon/ditto").then(
  (res) => res.json(),
);
const LazyComponents = () => {
  const data = use(pokemonPromise);
  return (
    <div>
      <p>{data.name}</p>
    </div>
  );
};
