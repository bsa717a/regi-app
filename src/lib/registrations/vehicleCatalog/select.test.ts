import { describe, expect, it } from "vitest";
import {
  selectFilePhoto,
  selectGenerationPhoto,
  type RemoteFile,
  type WikiPage,
} from "@/lib/registrations/vehicleCatalog/select";

function file(overrides: Partial<RemoteFile> & Pick<RemoteFile, "title">): RemoteFile {
  return {
    mime: "image/jpeg",
    width: 1600,
    height: 900,
    url: "https://upload.wikimedia.org/wikipedia/commons/a/a0/example.jpg",
    thumbUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/example.jpg/1400px-example.jpg",
    licenseShortName: "Public domain",
    licenseUrl: "",
    artistHtml: "IFCAR",
    descriptionHtml: overrides.title,
    pageUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
    ...overrides,
  };
}

const accordPage: WikiPage = {
  title: "Honda Accord (North America seventh generation)",
  imageName: "03-04 Honda Accord EX sedan.jpg",
  wikitext: `{{Infobox automobile
| name = Honda Accord
| image = 03-04 Honda Accord EX sedan.jpg
| manufacturer = Honda
| model_years = 2003–2007
| production = September 2002–2007
}}
The seventh generation North American Honda Accord.`,
};

const europePage: WikiPage = {
  title: "Honda Accord (Japan and Europe seventh generation)",
  imageName: "Honda Accord Europe.jpg",
  wikitext: `{{Infobox automobile
| name = Honda Accord
| image = Honda Accord Europe.jpg
| model_years = 2003–2007
}}
Japan and Europe Honda Accord.`,
};

const overview: WikiPage = {
  title: "Honda Accord",
  imageName: "2023 Honda Accord.jpg",
  wikitext: `{{Infobox automobile
| name = Honda Accord
| image = 2023 Honda Accord.jpg
| production = 1976–present
| model_years = 1976–present
}}`,
};

describe("selectGenerationPhoto", () => {
  const accordFile = file({
    title: "File:03-04 Honda Accord EX sedan.jpg",
    descriptionHtml: "2003-2004 Honda Accord photographed in Maryland",
    artistHtml: '<a href="//commons.wikimedia.org/wiki/User:IFCAR">IFCAR</a>',
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b9/03-04_Honda_Accord_EX_sedan.jpg",
  });

  it("uses the North American generation photo for a 2003 Accord", () => {
    const selected = selectGenerationPhoto(
      { year: 2003, make: "Honda", model: "Accord" },
      [overview, europePage, accordPage],
      [
        accordFile,
        file({
          title: "File:Honda Accord Europe.jpg",
          descriptionHtml: "European Honda Accord",
        }),
        file({
          title: "File:2023 Honda Accord.jpg",
          descriptionHtml: "2023 Honda Accord",
          licenseShortName: "CC BY-SA 4.0",
        }),
      ],
      2026,
    );
    expect(selected?.generationLabel).toBe(
      "Honda Accord (North America seventh generation)",
    );
    expect(selected).toMatchObject({
      yearFrom: 2003,
      yearTo: 2007,
      author: "IFCAR",
      license: { name: "Public domain", shareAlike: false },
    });
    expect(selected?.downloadUrl).toContain("upload.wikimedia.org");
  });

  it("does not reuse that generation for a later Accord", () => {
    expect(
      selectGenerationPhoto(
        { year: 2018, make: "Honda", model: "Accord" },
        [accordPage],
        [accordFile],
        2026,
      ),
    ).toBeNull();
  });

  it("rejects a non-commercial lead image", () => {
    expect(
      selectGenerationPhoto(
        { year: 2003, make: "Honda", model: "Accord" },
        [accordPage],
        [file({ ...accordFile, licenseShortName: "CC BY-NC-SA 4.0" })],
        2026,
      ),
    ).toBeNull();
  });

  it("does not accept another brand's file for this model", () => {
    expect(
      selectGenerationPhoto(
        { year: 2003, make: "Honda", model: "Accord" },
        [accordPage],
        [
          file({
            title: "File:2019 Tesla Model 3.jpg",
            descriptionHtml: "Tesla Model 3",
            licenseShortName: "CC BY 4.0",
          }),
        ],
        2026,
      ),
    ).toBeNull();
  });

  it("accepts an F-150 photo from the matching F-Series generation", () => {
    const page: WikiPage = {
      title: "Ford F-Series (fourteenth generation)",
      imageName: "2021 Ford F-150 SuperCrew.jpg",
      wikitext: `{{Infobox automobile
| name = Ford F-Series
| image = 2021 Ford F-150 SuperCrew.jpg
| model_years = 2021–present
}}
The F-150 is the light-duty pickup in this generation.`,
    };
    const selected = selectGenerationPhoto(
      { year: 2021, make: "Ford", model: "F-150" },
      [page],
      [
        file({
          title: "File:2021 Ford F-150 SuperCrew.jpg",
          licenseShortName: "CC BY-SA 4.0",
          artistHtml: "Kevauto",
          descriptionHtml: "A 2021 Ford F-150 SuperCrew",
        }),
      ],
      2026,
    );
    expect(selected).toMatchObject({
      yearFrom: 2021,
      author: "Kevauto",
      license: { name: "CC BY-SA 4.0", shareAlike: true },
    });
    expect(selected?.yearTo).toBeGreaterThanOrEqual(2021);
  });

  it("does not use a photo dated outside the generation", () => {
    const page: WikiPage = {
      title: "Honda CBR600RR",
      imageName: "2006 Honda CBR600RR profile.png",
      wikitext: `{{Infobox motorcycle
| name = Honda CBR600RR
| image = 2006 Honda CBR600RR profile.png
| production = 2003–present
}}
The Honda CBR600RR.`,
    };
    const selected = selectGenerationPhoto(
      { year: 2006, make: "Honda", model: "CBR600RR" },
      [page],
      [
        file({
          title: "File:Motodays 2016 show.jpg",
          descriptionHtml: "Honda CBR600RR at a show",
          licenseShortName: "CC BY-SA 4.0",
        }),
        file({
          title: "File:2006 Honda CBR600RR profile.png",
          descriptionHtml: "Profile view of a 2006 Honda CBR600RR",
          licenseShortName: "CC BY 2.5",
          mime: "image/png",
        }),
      ],
      2026,
    );
    expect(selected?.sourceTitle).toContain("2006 Honda CBR600RR");
    expect(selected?.yearFrom).toBe(2006);
    expect(selected?.yearTo).toBe(2006);
  });

  it("does not use a Ram photo for an F-150", () => {
    const page: WikiPage = {
      title: "Ford F-Series (fourteenth generation)",
      imageName: "2019 Ram 1500 Laramie.jpg",
      wikitext: `{{Infobox automobile
| image = 2019 Ram 1500 Laramie.jpg
| model_years = 2021–present
}}
The F-150 is mentioned here.`,
    };
    expect(
      selectGenerationPhoto(
        { year: 2021, make: "Ford", model: "F-150" },
        [page],
        [
          file({
            title: "File:2019 Ram 1500 Laramie.jpg",
            descriptionHtml: "2019 Ram 1500",
            licenseShortName: "CC BY-SA 4.0",
          }),
        ],
        2026,
      ),
    ).toBeNull();
  });
});

describe("selectFilePhoto", () => {
  it("keeps a year-matched file and ignores a different generation", () => {
    const selected = selectFilePhoto(
      { year: 1995, make: "Honda", model: "Civic" },
      [
        file({
          title: "File:1992-1995 Honda Civic sedan.jpg",
          descriptionHtml: "1992-1995 Honda Civic",
        }),
        file({
          title: "File:2022 Honda Civic.jpg",
          descriptionHtml: "2022 Honda Civic",
          licenseShortName: "CC BY 4.0",
        }),
      ],
    );
    expect(selected?.sourceTitle).toContain("1992-1995 Honda Civic");
    expect(selected).toMatchObject({ yearFrom: 1992, yearTo: 1995 });
  });
});
