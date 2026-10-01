const generateSlug = async (name, TherapistModel) => {
  let baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  let slug = baseSlug;
  let counter = 1;

  while (await TherapistModel.findOne({ slug })) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
};

module.exports = generateSlug;