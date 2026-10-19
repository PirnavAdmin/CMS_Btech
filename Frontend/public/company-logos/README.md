These icons are frontend assets, independent of the CMS API.

- `deloitte.png`: Deloitte domain icon, retrieved via Google's favicon service for `deloitte.com`.
- `ltts.png`: LTTS domain icon, retrieved via Google's favicon service for `ltts.com`.

Retrieved 16 October 2026. Other supported brand icons are bundled from the existing `react-icons` dependency (Microsoft's four-color symbol is rendered inline). Company-name aliases are in `src/utils/companyBrand.js`. Unknown brands fall back to initials. No runtime external logo service is used.
