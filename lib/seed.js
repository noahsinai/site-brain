// Demo field: ~12 sites in the Permian Basin (Midland/Odessa area)
const h = 3600 * 1000;
const d = 24 * h;

export function seedState() {
  const now = Date.now();
  return {
    field: "West Spraberry Unit — Permian Basin, TX",
    updated: now,
    sites: [
      {
        id: "42-17",
        name: "Well 42-17",
        type: "well",
        lat: 31.9621, lng: -102.0779,
        status: "down",
        crew_en_route: null,
        open_items: [
          { id: "oi-1", text: "Needs 50hp motor swap — send mechanic + crane truck (VFD fuse replaced but still tripping)", created: now - 3 * d }
        ],
        parts_on_pad: ["Old VFD fuse (burnt, for disposal)"],
        log: [
          { ts: now - 3 * d, who: "Mike R.", via: "text", summary: "I&E call-out. Replaced VFD fuse — unit still tripping under load. Suspect motor. Took the spare 50hp motor from the pad to test at the shop, so it is NOT on site.", parts_taken: ["Spare 50hp electric motor"], parts_left: [] },
          { ts: now - 9 * d, who: "Danny O.", via: "text", summary: "Routine pump check. Slight vibration on the drive end, logged for monitoring. No parts used.", parts_taken: [], parts_left: [] }
        ]
      },
      {
        id: "38-2",
        name: "Well 38-2",
        type: "well",
        lat: 31.9988, lng: -102.1411,
        status: "online",
        crew_en_route: null,
        open_items: [],
        parts_on_pad: ["Spare polished rod", "2x stuffing box rubbers"],
        log: [
          { ts: now - 1 * d, who: "Danny O.", via: "text", summary: "Replaced stuffing box rubbers, adjusted rod string. Well pumping normal. Left two spare rubbers in the doghouse.", parts_taken: [], parts_left: ["2x stuffing box rubbers"] }
        ]
      },
      {
        id: "HARTLEY-23-4",
        name: "Hartley 23-4",
        type: "well",
        lat: 31.9102, lng: -102.2105,
        status: "attention",
        crew_en_route: { name: "Luis G.", skill: "Pumper", eta: "today ~14:00" },
        open_items: [
          { id: "oi-2", text: "Recurring high tubing pressure alarms — needs choke inspection", created: now - 2 * d }
        ],
        parts_on_pad: [],
        log: [
          { ts: now - 2 * d, who: "SCADA", via: "system", summary: "High tubing pressure alarm, auto-logged. Repeated 3x in 24h.", parts_taken: [], parts_left: [] }
        ]
      },
      {
        id: "DOVE-CREEK-8-11",
        name: "Dove Creek 8-11",
        type: "well",
        lat: 31.8489, lng: -101.9936,
        status: "online",
        crew_en_route: null,
        open_items: [],
        parts_on_pad: ["Backup chemical pump"],
        log: [
          { ts: now - 5 * d, who: "Priya S.", via: "text", summary: "Chemical pump swap — old one cavitating. New pump installed and primed, old unit hauled to yard. Left a backup pump on the pad.", parts_taken: ["Cavitating chemical pump (to yard)"], parts_left: ["Backup chemical pump"] }
        ]
      },
      {
        id: "TXL-7",
        name: "TXL Battery 7",
        type: "battery",
        lat: 32.0454, lng: -102.0218,
        status: "online",
        crew_en_route: null,
        open_items: [
          { id: "oi-3", text: "Thief hatch seal on Tank 2 weeping — replace next trip", created: now - 6 * d }
        ],
        parts_on_pad: [],
        log: [
          { ts: now - 6 * d, who: "Carlos M.", via: "text", summary: "Gauged tanks, noticed thief hatch seal on Tank 2 weeping slightly. Not urgent. Flagged for next trip.", parts_taken: [], parts_left: [] }
        ]
      },
      {
        id: "44-9",
        name: "Well 44-9",
        type: "well",
        lat: 32.1037, lng: -102.1689,
        status: "online",
        crew_en_route: null,
        open_items: [],
        parts_on_pad: [],
        log: [
          { ts: now - 12 * d, who: "Mike R.", via: "text", summary: "Quarterly VFD cabinet inspection. Cleaned filters, torqued lugs. All good.", parts_taken: [], parts_left: [] }
        ]
      },
      {
        id: "31-5",
        name: "Well 31-5",
        type: "well",
        lat: 31.8851, lng: -102.1213,
        status: "down",
        crew_en_route: { name: "Tasha B.", skill: "Mechanic + crane truck", eta: "tomorrow 08:00" },
        open_items: [
          { id: "oi-4", text: "Gearbox locked up — unit down, crane scheduled", created: now - 1 * d }
        ],
        parts_on_pad: ["Replacement gearbox (staged, on skid)"],
        log: [
          { ts: now - 1 * d, who: "Danny O.", via: "text", summary: "Found gearbox locked up on routine rounds. Unit shut down. Replacement gearbox staged on a skid at the pad. Crane lined up for tomorrow.", parts_taken: [], parts_left: ["Replacement gearbox (staged, on skid)"] }
        ]
      },
      {
        id: "PECOS-PAD-A",
        name: "Pecos Pad A",
        type: "pad",
        lat: 31.7942, lng: -102.2554,
        status: "online",
        crew_en_route: null,
        open_items: [],
        parts_on_pad: ["Pallet of pump jack belts"],
        log: [
          { ts: now - 8 * d, who: "Priya S.", via: "text", summary: "Dropped a pallet of pump jack belts for the south wells. Stored in the connex.", parts_taken: [], parts_left: ["Pallet of pump jack belts"] }
        ]
      },
      {
        id: "27-12",
        name: "Well 27-12",
        type: "well",
        lat: 32.0211, lng: -101.9362,
        status: "online",
        crew_en_route: null,
        open_items: [],
        parts_on_pad: [],
        log: [
          { ts: now - 4 * d, who: "Luis G.", via: "text", summary: "Routine rounds, all normal. Greased the pumping unit.", parts_taken: [], parts_left: [] }
        ]
      },
      {
        id: "53-1",
        name: "Well 53-1",
        type: "well",
        lat: 31.9333, lng: -101.8997,
        status: "attention",
        crew_en_route: null,
        open_items: [
          { id: "oi-5", text: "Flowline weep at the wellhead union — needs fitting replacement, small job", created: now - 2 * d }
        ],
        parts_on_pad: [],
        log: [
          { ts: now - 2 * d, who: "Carlos M.", via: "text", summary: "Spotted a small flowline weep at the wellhead union. Tightened it, still seeping. Needs a new fitting — anyone passing by with a 2\" union can knock it out.", parts_taken: [], parts_left: [] }
        ]
      },
      {
        id: "MIDKIFF-SWD",
        name: "Midkiff SWD",
        type: "swd",
        lat: 31.8268, lng: -101.8541,
        status: "online",
        crew_en_route: null,
        open_items: [],
        parts_on_pad: ["Spare injection pump packing kit"],
        log: [
          { ts: now - 10 * d, who: "Tasha B.", via: "text", summary: "Repacked injection pump. Running smooth. Spare packing kit left in the shed.", parts_taken: [], parts_left: ["Spare injection pump packing kit"] }
        ]
      },
      {
        id: "61-3",
        name: "Well 61-3",
        type: "well",
        lat: 32.0788, lng: -101.8779,
        status: "online",
        crew_en_route: null,
        open_items: [],
        parts_on_pad: [],
        log: [
          { ts: now - 15 * d, who: "Danny O.", via: "text", summary: "New install commissioning complete. Well online and producing.", parts_taken: [], parts_left: [] }
        ]
      }
    ],
    feed: [
      { ts: now - 1 * d, who: "Danny O.", site_id: "31-5", text: "Found gearbox locked up on 31-5, unit's down. Staged the replacement on a skid, crane coming tomorrow 8am.", reply: "Logged. 31-5 marked down, gearbox swap scheduled — Tasha B. with crane truck, tomorrow 08:00." },
      { ts: now - 3 * d, who: "Mike R.", site_id: "42-17", text: "Replaced the VFD fuse on 42-17 but it's still tripping under load. Think it's the motor. Taking the spare 50hp back to the shop to test.", reply: "Logged. 42-17 still down — flagged for a motor swap (mechanic + crane truck). Noted the spare 50hp motor is no longer on site." }
    ]
  };
}
