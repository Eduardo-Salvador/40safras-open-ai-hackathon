# Domain notes for agents

This is the minimum shared vocabulary. It is not an agronomic authority.

- `ha`: area; 10,000 square meters.
- `kg/ha`: yield normalized by area.
- `field block` / `talhão`: separately scheduled part of a farm.
- `cultivar cycle`: approximate days from sowing to harvest for a seed variety.
- `second crop` / `safrinha`: usually corn planted after soybean in the same agricultural year.
- `rainfed` / `sequeiro`: production dependent on rain, without irrigation.
- `P20`: the 20th percentile, used here as a conservative historical outcome.
- `historical season`: one observed daily climate sequence, not a Monte Carlo sample.
- `analogous yield range`: the observed municipal-yield range in historically similar
  seasons; it is evidence, not a forecast.
- `ZARC`: official Brazilian climate-risk zoning used for regulatory/credit/insurance
  contexts. Quarenta Safras must not claim to replace it.

The reference materials contain two concepts that are not yet agronomically validated:
the operational “end of rains” threshold and the conversion to monetary margin. They may
be used only as declared prototype assumptions unless an event mentor/domain expert
validates them. If that validation does not happen, prioritize second-crop feasible area
and viable-season count over currency claims.

Data-resolution caveat: ERA5/Open-Meteo is regional, not field-level microclimate. The UI
must state this whenever it names a specific farm operation.

The engine is configuration-driven for crop profiles, but “supports multiple crops” is a
valid claim only for profiles that have reviewed parameters and specific tests. The core
validated succession is soybean followed by second-crop corn.
