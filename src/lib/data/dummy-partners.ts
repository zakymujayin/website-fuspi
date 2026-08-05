export type DummyPartner = {
  id: string;
  name: string;
  website?: string;
};

export const dummyPartners: readonly DummyPartner[] = [
  {id: "uin-jakarta", name: "UIN Syarif Hidayatullah Jakarta", website: "https://uinjkt.ac.id"},
  {id: "uin-bandung", name: "UIN Sunan Gunung Djati Bandung", website: "https://uinsgd.ac.id"},
  {id: "uin-makassar", name: "UIN Alauddin Makassar", website: "https://uin-alauddin.ac.id"},
  {id: "uin-yogyakarta", name: "UIN Sunan Kalijaga Yogyakarta", website: "https://uin-suka.ac.id"},
  {id: "iain-palu", name: "IAIN Palu", website: "https://iainpalu.ac.id"},
  {id: "uinsa", name: "UIN Sunan Ampel Surabaya", website: "https://uinsa.ac.id"},
] as const;
