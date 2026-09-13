import {
  remainingRestSeconds,
} from "../rest-time";


describe(
  "remainingRestSeconds",
  () => {
    it(
      "derives time from the timestamp",
      () => {
        const now =
          new Date(
            "2026-09-12T10:00:00.000Z"
          ).getTime();


        expect(
          remainingRestSeconds(
            "2026-09-12T10:03:00.000Z",
            now,
          )
        ).toBe(
          180
        );
      },
    );


    it(
      "does not go below zero",
      () => {
        const now =
          new Date(
            "2026-09-12T10:05:00.000Z"
          ).getTime();


        expect(
          remainingRestSeconds(
            "2026-09-12T10:03:00.000Z",
            now,
          )
        ).toBe(
          0
        );
      },
    );
  },
);