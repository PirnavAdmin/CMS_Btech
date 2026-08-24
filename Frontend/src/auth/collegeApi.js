import axios from "axios";

const API = axios.create({
  baseURL: "https://stagnant-craftily-paving.ngrok-free.dev/api/v1",
});

export const getColleges = () => {
  return API.get("/colleges");
};

export const getCollegeById = (id) => {
  return API.get(`/colleges/${id}`);
};

export const searchColleges = (searchTerm) => {
  return API.get("/colleges/search", {
    params: {
      search: searchTerm,
    },
  });
};

export const createCollege = (collegeData) => {
  return API.post("/colleges", collegeData);
};

export const updateCollege = (id, collegeData) => {
  return API.put(`/colleges/${id}`, collegeData);
};

export const updateCollegeStatus = (id, status) => {
  return API.patch(`/colleges/${id}/status`, status);
};